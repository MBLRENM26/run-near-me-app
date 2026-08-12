import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSyncRun } from "@/lib/sync-run-log.server";
import {
  planEnglandAthleticsBatch,
  type EaEvent,
  type ExistingEaRow,
} from "@/lib/sync-england-athletics-plan";

// Syncs licensed running events from the England Athletics RunEvents
// public event finder API into the events table. Idempotent: upserts on
// norm_id `ea-<EA event UUID>` so existing records are updated in place,
// never duplicated. Existing slugs are preserved so URLs don't change.

const EA_URL = "https://www.englandathletics.org/runevents/wp-admin/admin-ajax.php";
const MAX_PAGES = 120;

export type EnglandAthleticsSyncResult = {
  ok: true;
  fetched: number;
  active: number;
  written: number;
  updatedExisting: number;
  newEvents: number;
  skippedDupes: number;
  skippedNoDate: number;
  failedPages: number[];
  // Last page EA reported (1-based). Drivers loop until done = true.
  lastPage: number;
  // True when this chunk reached the final page of EA's feed.
  done: boolean;
};

async function fetchPage(
  page: number,
  order: "asc" | "desc",
): Promise<{ events: EaEvent[]; lastPage: number }> {
  const orderParam = order === "desc" ? "&order=desc" : "";
  const url = `${EA_URL}?action=data_api_search&types%5B%5D=event&page=${page}${orderParam}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RunningEventsNearMe/1.0)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`EA API returned ${res.status} for page ${page}`);
  const text = await res.text();
  const start = text.indexOf("{");
  if (start === -1) throw new Error(`EA API returned non-JSON for page ${page}`);
  const json = JSON.parse(text.slice(start)) as {
    data: EaEvent[];
    meta: { last_page: number };
  };
  return { events: json.data ?? [], lastPage: json.meta?.last_page ?? page };
}

async function fetchPageSafe(
  page: number,
  order: "asc" | "desc",
): Promise<{ events: EaEvent[]; lastPage: number } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchPage(page, order);
    } catch {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return null;
}

export type EnglandAthleticsSyncOptions = {
  fromPage?: number;
  toPage?: number;
  order?: "asc" | "desc";
};

export async function runEnglandAthleticsSync(
  opts: EnglandAthleticsSyncOptions = {},
): Promise<EnglandAthleticsSyncResult> {
  const run = await startSyncRun("england-athletics");

  const fromPage = Math.max(1, opts.fromPage ?? 1);
  const toParam = opts.toPage ?? MAX_PAGES;
  const order: "asc" | "desc" = opts.order === "desc" ? "desc" : "asc";

  try {
    const all: EaEvent[] = [];
    const failedPages: number[] = [];
    let lastPage = toParam;
    for (let p = fromPage; p <= Math.min(toParam, lastPage, MAX_PAGES); p++) {
      const result = await fetchPageSafe(p, order);
      if (!result) {
        failedPages.push(p);
        continue;
      }
      lastPage = result.lastPage;
      all.push(...result.events);
      if (p >= lastPage) break;
    }

    const active = all.filter((e) => e.type === "event" && e.status === "ACTIVE" && e.name);

    const existing: ExistingEaRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: chunk, error: exErr } = await supabaseAdmin
        .from("events")
        .select(
          "slug, name, date_from, norm_id, source, lat, lng, distance_tags, terrain_tags, is_curated_tags, governance, race_profile",
        )
        .range(offset, offset + 999);
      if (exErr) {
        await run.finish({
          status: "error",
          error_message: exErr.message,
          failed_pages: failedPages.length,
        });
        throw new Error(exErr.message);
      }
      existing.push(...(chunk ?? []));
      if (!chunk || chunk.length < 1000) break;
    }
    const plan = planEnglandAthleticsBatch({
      events: active,
      existingRows: existing,
      todayISO: new Date().toISOString().slice(0, 10),
    });

    let written = 0;
    for (let i = 0; i < plan.rows.length; i += 200) {
      const batch = plan.rows.slice(i, i + 200);
      const { data, error } = await supabaseAdmin
        .from("events")
        .upsert(batch, { onConflict: "norm_id" })
        .select("id");
      if (error) {
        await run.finish({
          status: "error",
          error_message: error.message,
          fetched: all.length,
          active: active.length,
          written,
          failed_pages: failedPages.length,
        });
        throw new Error(error.message);
      }
      written += data?.length ?? 0;
    }

    await run.finish({
      status: failedPages.length > 0 ? "partial" : "success",
      fetched: all.length,
      active: active.length,
      written,
      updated_existing: plan.updatedExisting,
      new_events: plan.newEvents,
      skipped_dupes: plan.skippedDupes,
      skipped_no_date: plan.skippedNoDate,
      failed_pages: failedPages.length,
    });

    return {
      ok: true,
      fetched: all.length,
      active: active.length,
      written,
      updatedExisting: plan.updatedExisting,
      newEvents: plan.newEvents,
      skippedDupes: plan.skippedDupes,
      skippedNoDate: plan.skippedNoDate,
      failedPages,
      lastPage,
      done: lastPage <= toParam,
    };
  } catch (err) {
    // run.finish may already have been called on the typed error paths above;
    // this catches any unexpected throw so the sync_runs row isn't stuck "running".
    await run
      .finish({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
      })
      .catch(() => undefined);
    throw err;
  }
}
