import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSyncRun } from "@/lib/sync-run-log.server";
import { loadScottishClubWebsiteMap } from "@/lib/sync-scottish-athletics-clubs.server";

// Syncs running events from the Scottish Athletics public event browser
// (JustGo widget API) into the events table. Idempotent: upserts on norm_id
// and skips events that already exist from another source.

const JUSTGO_URL =
  "https://scottishathletics.justgo.com/WidgetService.mvc/ExecuteWidgetCommandAlt";
const WEBLET_ID = "64728f3b-1e94-44fc-8217-e70f15957999";
const PAGE_SIZE = 50;
const MAX_PAGES = 10;

const INCLUDED_CATEGORIES = new Set([
  "Road Race / Multi Terrain",
  "Trail Race / Ultra Distance",
  "Hill Running",
  "Cross Country",
]);

type JustGoEvent = {
  DocId: number;
  EventName: string;
  EventCategory: string;
  Directlink: string;
  Address: {
    Town: string | null;
    County: string | null;
    Postcode: string | null;
    Country: string | null;
  };
  Latlng: { Lat: string; Lng: string };
  EntityInfo: { Name: string | null };
  Starts: { Date: string | null };
  Ends: { Date: string | null };
  PriceSettings: { DisplayPrice: string | null };
};

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseJustGoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) + 1;
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateRaw(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function cleanName(name: string): string {
  return name.replace(/\s*:\s*ES\d+\s*$/i, "").trim();
}

function distancesFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (/\bultra\b/.test(n)) return "Ultra";
  if (/half[\s-]?marathon|\bhalf\b/.test(n)) return "Half Marathon";
  if (/\bmarathon\b/.test(n)) return "Marathon";
  const km = n.match(/\b(\d{1,3}(?:\.\d)?)\s?k(m)?\b/);
  if (km) return `${km[1]}K`;
  const miles = n.match(/\b(\d{1,3}(?:\.\d)?)\s?miles?\b/);
  if (miles) return `${miles[1]} miles`;
  return null;
}

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
  const json = (await res.json()) as Array<{
    IsSuccess: boolean;
    Result: { Result: { Data: JustGoEvent[] } };
  }>;
  return json[0]?.Result?.Result?.Data ?? [];
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

    // Map of slugified organiser/club name → club website. Lets us
    // populate organiser_url for events whose only link is on the JustGo
    // booking subdomain. Falls back to NULL when no club match exists.
    const clubWebsiteMap = await loadScottishClubWebsiteMap().catch(
      () => new Map<string, string>(),
    );

    // Scotland-scoped rows for name/date dedupe + updated-vs-new accounting.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("events")
      .select("slug, name, date_from, norm_id")
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
    const existingNormIds = new Set(
      (existing ?? []).map((e) => e.norm_id).filter(Boolean) as string[],
    );
    const existingNameDate = new Set(
      (existing ?? []).map(
        (e) => `${(e.name ?? "").toLowerCase().trim()}|${e.date_from ?? ""}`,
      ),
    );

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
    const globalSlugOwners = new Map(
      (allSlugRows ?? []).map((r) => [r.slug, r.norm_id]),
    );

    const todayISO = new Date().toISOString().slice(0, 10);
    const seenSlugs = new Set<string>();
    type EventInsert =
      import("@/integrations/supabase/types").Database["public"]["Tables"]["events"]["Insert"];
    const rows: EventInsert[] = [];
    let skippedDupes = 0;
    let skippedNoDate = 0;
    let newEvents = 0;
    let updatedExisting = 0;

    for (const e of running) {
      const name = cleanName(e.EventName);
      const dateFrom = parseJustGoDate(e.Starts?.Date);
      const dateTo = parseJustGoDate(e.Ends?.Date);
      if (!name || !dateFrom) {
        skippedNoDate++;
        continue;
      }

      const key = `${name.toLowerCase()}|${dateFrom}`;
      if (existingNameDate.has(key)) {
        skippedDupes++;
        continue;
      }

      const baseSlug = slugify(name);
      const baseNormId = `scottishathletics-${baseSlug}`;
      let slug = baseSlug;
      const baseOwner = globalSlugOwners.get(baseSlug);
      if ((baseOwner && baseOwner !== baseNormId) || seenSlugs.has(baseSlug)) {
        slug = `${baseSlug}-${dateFrom}`;
      }
      let suffix = 2;
      while (true) {
        const owner = globalSlugOwners.get(slug);
        const candidateNormId = `scottishathletics-${slug}`;
        if (!seenSlugs.has(slug) && (!owner || owner === candidateNormId)) break;
        slug = `${baseSlug}-${dateFrom}-${suffix++}`;
        if (suffix > 20) break;
      }
      seenSlugs.add(slug);

      const lat = e.Latlng?.Lat ? Number(e.Latlng.Lat) : null;
      const lng = e.Latlng?.Lng ? Number(e.Latlng.Lng) : null;

      const finalNormId = `scottishathletics-${slug}`;
      if (existingNormIds.has(finalNormId)) updatedExisting++;
      else newEvents++;
      const organiser = e.EntityInfo?.Name?.trim() || null;
      // Match organiser → real club website. Never use JustGo's Directlink
      // here — that's the booking platform, not the organiser's site.
      const organiserUrl = organiser
        ? clubWebsiteMap.get(slugify(organiser)) ?? null
        : null;
      rows.push({
        norm_id: finalNormId,
        name,
        slug,
        date_from: dateFrom,
        date_to: dateTo && dateTo !== dateFrom ? dateTo : null,
        date_raw: formatDateRaw(dateFrom),
        date_is_estimated: false,
        town: e.Address?.Town?.trim() || null,
        county: e.Address?.County?.trim() || null,
        country: "Scotland",
        region: "Scotland",
        lat: lat !== null && Number.isFinite(lat) ? lat : null,
        lng: lng !== null && Number.isFinite(lng) ? lng : null,
        distances: distancesFromName(name),
        discipline: e.EventCategory,
        entry_url: e.Directlink || null,
        organiser,
        organiser_url: organiserUrl,
        entry_fee: e.PriceSettings?.DisplayPrice?.trim() || null,
        source: "scottishathletics",
        source_url: e.Directlink || null,
        status: "ACTIVE",
        sort_date: dateFrom,
        is_upcoming: dateFrom >= todayISO,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .upsert(rows, { onConflict: "norm_id" })
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
      new_events: newEvents,
      updated_existing: updatedExisting,
      skipped_dupes: skippedDupes,
      skipped_no_date: skippedNoDate,
    });

    return {
      ok: true,
      fetched: all.length,
      running: running.length,
      written,
      newEvents,
      updatedExisting,
      skippedDupes,
      skippedNoDate,
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
