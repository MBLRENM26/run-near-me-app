import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";
import { buildSeriesKey, describeSeriesKey } from "@/lib/series-key";

/**
 * Read-only recurrence + replacement-rate evidence for the admin area.
 *
 * Everything here is a *proposal* or a *measurement*. No function in this
 * module writes to the database, creates a migration, or changes any public
 * projection. Series keys proposed here are reviewed by an admin before any
 * separately approved audited data update applies them.
 */

// Loaded lazily so the server-only session module never enters the client
// import graph (route components statically import this module).
const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import("@/lib/admin-session.server");
  return impl();
});

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

type EventRow = {
  id: string;
  slug: string | null;
  name: string;
  town: string | null;
  county: string | null;
  region: string | null;
  sort_date: string | null;
  created_at: string;
  status: string;
  series_key: string | null;
  distances: string | null;
  distance_tags: string[] | null;
  entry_url: string | null;
  organiser_url: string | null;
};

const EVENT_COLUMNS =
  "id, slug, name, town, county, region, sort_date, created_at, status, series_key, distances, distance_tags, entry_url, organiser_url";

const PAGE_SIZE = 1000;
const MAX_PAGES = 12;

/** Fetch every non-duplicate event row we need, paging past the 1000-row cap. */
async function fetchEventRows(): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("status", "ACTIVE")
      .not("sort_date", "is", null)
      .order("sort_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as EventRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function discoverable(row: EventRow): boolean {
  return hasOrganiserOwnedLink(row.entry_url, row.organiser_url);
}

// ---------------------------------------------------------------------------
// 1. Series proposals
// ---------------------------------------------------------------------------

export type SeriesOccurrence = {
  id: string;
  slug: string | null;
  name: string;
  town: string | null;
  sort_date: string | null;
  stored_series_key: string | null;
  is_future: boolean;
  discoverable: boolean;
};

export type SeriesProposal = {
  proposed_key: string;
  label: string;
  occurrences: SeriesOccurrence[];
  future_count: number;
  past_count: number;
  stored_matches: number;
  needs_write: number;
};

function groupBySeries(rows: EventRow[]): Map<string, EventRow[]> {
  const groups = new Map<string, EventRow[]>();
  for (const row of rows) {
    const key = buildSeriesKey(row);
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export const getSeriesProposals = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        minOccurrences: z.number().int().min(2).max(10).default(2),
        limit: z.number().int().min(1).max(200).default(60),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();
    const today = todayIso();
    const rows = await fetchEventRows();
    const groups = groupBySeries(rows);

    const proposals: SeriesProposal[] = [];
    let totalGroups = 0;
    let totalRowsNeedingWrite = 0;

    for (const [key, members] of groups) {
      if (members.length < data.minOccurrences) continue;
      totalGroups += 1;
      const occurrences: SeriesOccurrence[] = members
        .map((m) => ({
          id: m.id,
          slug: m.slug,
          name: m.name,
          town: m.town,
          sort_date: m.sort_date,
          stored_series_key: m.series_key,
          is_future: Boolean(m.sort_date && m.sort_date >= today),
          discoverable: discoverable(m),
        }))
        .sort((a, b) => (b.sort_date ?? "").localeCompare(a.sort_date ?? ""));

      const storedMatches = occurrences.filter((o) => o.stored_series_key === key).length;
      const needsWrite = occurrences.length - storedMatches;
      totalRowsNeedingWrite += needsWrite;

      proposals.push({
        proposed_key: key,
        label: describeSeriesKey(key),
        occurrences,
        future_count: occurrences.filter((o) => o.is_future).length,
        past_count: occurrences.filter((o) => !o.is_future).length,
        stored_matches: storedMatches,
        needs_write: needsWrite,
      });
    }

    // Biggest, most-evidenced series first — those are the safest to confirm.
    proposals.sort(
      (a, b) => b.occurrences.length - a.occurrences.length || a.label.localeCompare(b.label),
    );

    return {
      generated_at: new Date().toISOString(),
      scanned_events: rows.length,
      total_groups: totalGroups,
      rows_needing_write: totalRowsNeedingWrite,
      proposals: proposals.slice(0, data.limit),
    };
  });

// ---------------------------------------------------------------------------
// 2. Rediscovery worklist
// ---------------------------------------------------------------------------

export type RediscoveryRow = {
  proposed_key: string;
  label: string;
  last_name: string;
  last_slug: string | null;
  last_town: string | null;
  last_region: string | null;
  last_seen: string;
  days_since: number;
  editions_recorded: number;
  had_organiser_link: boolean;
};

export const getRediscoveryWorklist = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lookbackDays: z.number().int().min(30).max(1100).default(400),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();
    const today = todayIso();
    const cutoff = new Date(Date.now() - data.lookbackDays * 86_400_000).toISOString().slice(0, 10);

    const rows = await fetchEventRows();
    const groups = groupBySeries(rows);

    const worklist: RediscoveryRow[] = [];
    for (const [key, members] of groups) {
      const hasFuture = members.some((m) => m.sort_date && m.sort_date >= today);
      if (hasFuture) continue;

      const past = members
        .filter((m) => m.sort_date && m.sort_date < today && m.sort_date >= cutoff)
        .sort((a, b) => (b.sort_date ?? "").localeCompare(a.sort_date ?? ""));
      if (past.length === 0) continue;

      const last = past[0];
      const lastSeen = last.sort_date as string;
      worklist.push({
        proposed_key: key,
        label: describeSeriesKey(key),
        last_name: last.name,
        last_slug: last.slug,
        last_town: last.town,
        last_region: last.region,
        last_seen: lastSeen,
        days_since: Math.max(
          0,
          Math.round((Date.parse(today) - Date.parse(lastSeen)) / 86_400_000),
        ),
        editions_recorded: members.length,
        had_organiser_link: past.some(discoverable),
      });
    }

    // Longest overdue first — an annual race last seen 12 months ago is due now.
    worklist.sort((a, b) => b.days_since - a.days_since || a.label.localeCompare(b.label));

    const dueNow = worklist.filter((w) => w.days_since >= 330).length;

    return {
      generated_at: new Date().toISOString(),
      lookback_days: data.lookbackDays,
      total_missing_future: worklist.length,
      due_now: dueNow,
      with_organiser_link: worklist.filter((w) => w.had_organiser_link).length,
      rows: worklist.slice(0, data.limit),
    };
  });

// ---------------------------------------------------------------------------
// 3. Replacement rate
// ---------------------------------------------------------------------------

export type ReplacementMonth = {
  month: string;
  gained: number;
  gained_discoverable: number;
  aged_out: number;
  aged_out_discoverable: number;
  net: number;
  net_discoverable: number;
};

export const getReplacementRate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ months: z.number().int().min(3).max(24).default(12) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();
    const today = todayIso();
    const rows = await fetchEventRows();

    const start = new Date();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (data.months - 1));
    const startMonth = start.toISOString().slice(0, 7);

    const buckets = new Map<string, ReplacementMonth>();
    const ensure = (month: string): ReplacementMonth => {
      let b = buckets.get(month);
      if (!b) {
        b = {
          month,
          gained: 0,
          gained_discoverable: 0,
          aged_out: 0,
          aged_out_discoverable: 0,
          net: 0,
          net_discoverable: 0,
        };
        buckets.set(month, b);
      }
      return b;
    };

    for (const row of rows) {
      const isDiscoverable = discoverable(row);

      // Gained: added to the catalogue while still future-dated.
      const createdMonth = monthKey(row.created_at);
      if (
        createdMonth >= startMonth &&
        row.sort_date &&
        row.sort_date >= row.created_at.slice(0, 10)
      ) {
        const b = ensure(createdMonth);
        b.gained += 1;
        if (isDiscoverable) b.gained_discoverable += 1;
      }

      // Aged out: the occurrence date has passed, so the page stops answering
      // future-intent searches.
      if (row.sort_date && row.sort_date < today) {
        const passedMonth = monthKey(row.sort_date);
        if (passedMonth >= startMonth) {
          const b = ensure(passedMonth);
          b.aged_out += 1;
          if (isDiscoverable) b.aged_out_discoverable += 1;
        }
      }
    }

    const months = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
    for (const m of months) {
      m.net = m.gained - m.aged_out;
      m.net_discoverable = m.gained_discoverable - m.aged_out_discoverable;
    }

    const futureRows = rows.filter((r) => r.sort_date && r.sort_date >= today);

    return {
      generated_at: new Date().toISOString(),
      months,
      totals: {
        gained: months.reduce((s, m) => s + m.gained, 0),
        aged_out: months.reduce((s, m) => s + m.aged_out, 0),
        gained_discoverable: months.reduce((s, m) => s + m.gained_discoverable, 0),
        aged_out_discoverable: months.reduce((s, m) => s + m.aged_out_discoverable, 0),
      },
      current: {
        future_events: futureRows.length,
        future_discoverable: futureRows.filter(discoverable).length,
        past_events: rows.length - futureRows.length,
      },
    };
  });

// ---------------------------------------------------------------------------
// 4. Last run per source
// ---------------------------------------------------------------------------

export type SourceSummary = {
  source: string;
  status: string;
  started_at: string;
  new_events: number | null;
  updated_existing: number | null;
  error_message: string | null;
  days_since: number;
};

export const getSyncSourceSummary = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminOrThrow();
  const { data, error } = await supabaseAdmin
    .from("sync_runs")
    .select("source, status, started_at, new_events, updated_existing, error_message")
    .order("started_at", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);

  const latest = new Map<string, SourceSummary>();
  for (const run of data ?? []) {
    if (latest.has(run.source)) continue;
    latest.set(run.source, {
      source: run.source,
      status: run.status,
      started_at: run.started_at,
      new_events: run.new_events,
      updated_existing: run.updated_existing,
      error_message: run.error_message,
      days_since: Math.max(0, Math.round((Date.now() - Date.parse(run.started_at)) / 86_400_000)),
    });
  }

  return [...latest.values()].sort((a, b) => a.source.localeCompare(b.source));
});
