import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSyncRun } from "@/lib/sync-run-log.server";
import { loadScottishClubWebsiteMap } from "@/lib/sync-scottish-athletics-clubs.server";
import { isUkOutwardCode, normalisePostcode } from "@/lib/postcode";
import type { Coordinates } from "@/lib/source-enrichment";
import { planScottishAthleticsBatch, type JustGoEvent } from "@/lib/sync-scottish-athletics-plan";

// Syncs running events from the Scottish Athletics public event browser
// (JustGo widget API) into the events table. Idempotent: upserts on norm_id.
// Batch identity + slug resolution lives in sync-scottish-athletics-plan
// so it can be unit tested without touching Supabase.

const JUSTGO_URL = "https://scottishathletics.justgo.com/WidgetService.mvc/ExecuteWidgetCommandAlt";
const WEBLET_ID = "64728f3b-1e94-44fc-8217-e70f15957999";
const PAGE_SIZE = 50;
const MAX_PAGES = 10;

const INCLUDED_CATEGORIES = new Set([
  "Road Race / Multi Terrain",
  "Trail Race / Ultra Distance",
  "Hill Running",
  "Cross Country",
]);

export type ScottishAthleticsSyncResult = {
  ok: true;
  fetched: number;
  running: number;
  written: number;
  newEvents: number;
  updatedExisting: number;
  skippedDupes: number;
  skippedNoDate: number;
};

async function fetchPage(pageNumber: number): Promise<JustGoEvent[]> {
  const body = {
    payload: {
      commands: [
        {
          Id: 1,
          Service: "GDE",
          Method: "FetchObjectsPublic",
          Arguments: [
            "Event",
            {
              Method: "FindEvents",
              key: "",
              Categories: {},
              Provider: [],
              OrderBy: "asc",
              SortBy: "date",
              PageNumber: pageNumber,
              NumberOfRows: PAGE_SIZE,
              IsShop: false,
              InstallmentAvailable: false,
              Country: "",
              County: [],
              WebletId: WEBLET_ID,
            },
          ],
        },
      ],
    },
    paths: ["commands"],
  };

  const res = await fetch(JUSTGO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`JustGo API returned ${res.status}`);
  const payload = await res.json();
  const json = (typeof payload === "string" ? JSON.parse(payload) : payload) as Array<{
    IsSuccess: boolean;
    Result: { Result: { Data: JustGoEvent[] } };
  }>;
  return json[0]?.Result?.Result?.Data ?? [];
}

async function loadPostcodeCoordinates(records: JustGoEvent[]): Promise<Map<string, Coordinates>> {
  const postcodes = [
    ...new Set(
      records
        .map((event) => event.Address?.Postcode?.trim())
        .filter((postcode): postcode is string => !!postcode)
        .map(normalisePostcode),
    ),
  ];
  const coordinates = new Map<string, Coordinates>();
  if (!postcodes.length) return coordinates;

  for (let offset = 0; offset < postcodes.length; offset += 100) {
    const batch = postcodes.slice(offset, offset + 100);
    try {
      const response = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: batch }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const json = (await response.json()) as {
          result?: Array<{
            query: string;
            result: { latitude: number; longitude: number } | null;
          }>;
        };
        for (const item of json.result ?? []) {
          if (
            item.result &&
            Number.isFinite(item.result.latitude) &&
            Number.isFinite(item.result.longitude)
          ) {
            coordinates.set(normalisePostcode(item.query), {
              lat: item.result.latitude,
              lng: item.result.longitude,
            });
          }
        }
      }
    } catch {
      // Best-effort enrichment: never fail a governing-body sync because the
      // independent postcode service is unavailable.
    }
  }

  for (const postcode of postcodes) {
    if (coordinates.has(postcode) || !isUkOutwardCode(postcode)) continue;
    try {
      const response = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(postcode)}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) continue;
      const json = (await response.json()) as {
        result?: { latitude: number; longitude: number };
      };
      if (
        json.result &&
        Number.isFinite(json.result.latitude) &&
        Number.isFinite(json.result.longitude)
      ) {
        coordinates.set(postcode, {
          lat: json.result.latitude,
          lng: json.result.longitude,
        });
      }
    } catch {
      // Leave unresolved; existing coordinates are retained by the planner.
    }
  }
  return coordinates;
}

export async function runScottishAthleticsSync(): Promise<ScottishAthleticsSyncResult> {
  const run = await startSyncRun("scottish-athletics");

  try {
    const all: JustGoEvent[] = [];
    for (let p = 1; p <= MAX_PAGES; p++) {
      const page = await fetchPage(p);
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const running = all.filter((e) => INCLUDED_CATEGORIES.has(e.EventCategory));
    const postcodeCoordinates = await loadPostcodeCoordinates(running);

    // Map of slugified organiser/club name → club website. Lets us
    // populate organiser_url for events whose only link is on the JustGo
    // booking subdomain. Falls back to NULL when no club match exists.
    const clubWebsiteMap = await loadScottishClubWebsiteMap().catch(
      () => new Map<string, string>(),
    );

    // Scotland-scoped rows for name/date dedupe + updated-vs-new accounting.
    // NOTE: source_url is included so the planner can index by JustGo ref.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("events")
      .select(
        "slug, name, date_from, norm_id, source, source_url, lat, lng, distance_tags, terrain_tags, is_curated_tags, governance, race_profile",
      )
      .eq("status", "ACTIVE")
      .or("region.eq.Scotland,country.eq.Scotland");
    if (exErr) {
      await run.finish({
        status: "error",
        error_message: exErr.message,
        fetched: all.length,
        active: running.length,
      });
      throw new Error(exErr.message);
    }

    // Global slug set — a Scotland event's slug can collide with any other
    // region's event. Without this the DB unique index throws on upsert.
    const { data: allSlugRows, error: allSlugErr } = await supabaseAdmin
      .from("events")
      .select("slug, norm_id");
    if (allSlugErr) {
      await run.finish({
        status: "error",
        error_message: allSlugErr.message,
        fetched: all.length,
        active: running.length,
      });
      throw new Error(allSlugErr.message);
    }
    const globalSlugOwners = new Map<string, string | null>(
      (allSlugRows ?? [])
        .filter((r): r is { slug: string; norm_id: string | null } => !!r.slug)
        .map((r) => [r.slug, r.norm_id]),
    );

    const todayISO = new Date().toISOString().slice(0, 10);

    // Plan the batch: dedupe by ref, group by name+date, resolve slugs,
    // assert uniqueness. Throws loudly on any unsafe collision.
    const plan = planScottishAthleticsBatch({
      records: running,
      existingRows: existing ?? [],
      globalSlugOwners,
      clubWebsiteMap,
      postcodeCoordinates,
      todayISO,
    });

    if (plan.warnings.length > 0) {
      for (const w of plan.warnings) {
        console.warn(`[scottish-athletics-sync] ${w}`);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .upsert(plan.rows, { onConflict: "norm_id" })
      .select("id");
    if (error) {
      await run.finish({
        status: "error",
        error_message: error.message,
        fetched: all.length,
        active: running.length,
      });
      throw new Error(error.message);
    }

    const written = data?.length ?? 0;
    await run.finish({
      status: "success",
      fetched: all.length,
      active: running.length,
      written,
      new_events: plan.stats.newEvents,
      updated_existing: plan.stats.updatedExisting,
      skipped_dupes: plan.stats.skippedDupes + plan.stats.sharedRefSkipped,
      skipped_no_date: plan.stats.skippedNoDate,
    });

    return {
      ok: true,
      fetched: all.length,
      running: running.length,
      written,
      newEvents: plan.stats.newEvents,
      updatedExisting: plan.stats.updatedExisting,
      skippedDupes: plan.stats.skippedDupes + plan.stats.sharedRefSkipped,
      skippedNoDate: plan.stats.skippedNoDate,
    };
  } catch (err) {
    await run
      .finish({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
      })
      .catch(() => undefined);
    throw err;
  }
}
