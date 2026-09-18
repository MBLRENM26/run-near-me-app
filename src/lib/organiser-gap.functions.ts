import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COMMERCIAL_ORGANISER_HOSTS,
  buildClubHostIndex,
  eventHost,
  isUnnamedOrganiser,
  proposeOrganiser,
  type ClubHost,
} from "@/lib/organiser-resolution";

/**
 * Read-only organiser-identity gap evidence for the admin area.
 *
 * Answers: which future events have no usable organiser name, what
 * deterministic evidence could name them, and which records need manual
 * triage. No function here writes to the database — proposals are reviewed
 * by an admin and applied later through a separately approved audited edit.
 */

const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import("@/lib/admin-session.server");
  return impl();
});

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 6;
const DEMAND_WINDOW_DAYS = 90;

type GapEventRow = {
  id: string;
  slug: string | null;
  name: string;
  organiser: string | null;
  organiser_type: string | null;
  organiser_url: string | null;
  entry_url: string | null;
  sort_date: string | null;
  source: string | null;
  town: string | null;
  county: string | null;
};

const GAP_COLUMNS =
  "id, slug, name, organiser, organiser_type, organiser_url, entry_url, sort_date, source, town, county";

async function fetchFutureEvents(today: string): Promise<GapEventRow[]> {
  const rows: GapEventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(GAP_COLUMNS)
      .eq("status", "ACTIVE")
      .gte("sort_date", today)
      .order("sort_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as GapEventRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchActiveClubs(): Promise<ClubHost[]> {
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("id, name, website_url")
    .eq("status", "ACTIVE")
    .not("website_url", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as ClubHost[];
}

function currentOrganiserLabel(organiser: string | null): string {
  if (isUnnamedOrganiser(organiser)) return "(no name)";
  return organiser as string;
}

export type CohortTotals = {
  future_events: number;
  named: number;
  named_share_pct: number;
  unnamed_total: number;
  /** Unnamed events whose organiser_url sits on an organiser-owned site. */
  unnamed_with_organiser_url: number;
  cohorts: {
    ea_with_url: number;
    ea_without_url: number;
    runabc: number;
    tra: number;
    welsh_ni: number;
    tbc_literal: number;
    unknown_literal: number;
    other_unnamed: number;
  };
};

export type ProposalRow = {
  id: string;
  slug: string | null;
  name: string;
  town: string | null;
  county: string | null;
  sort_date: string | null;
  source: string | null;
  current: string;
  proposal: { organiser: string; organiser_type: string; basis: string };
  organiser_url: string | null;
  search_clicks: number;
  reminder_requests: number;
  demand_signals: number;
};

export type TriageRow = {
  id: string;
  slug: string | null;
  name: string;
  town: string | null;
  county: string | null;
  sort_date: string | null;
  current: string;
  entry_url: string | null;
  entry_host: string | null;
  search_clicks: number;
  reminder_requests: number;
  demand_signals: number;
};

export type OrganiserGap = {
  generated_at: string;
  totals: CohortTotals;
  /** Live match counts per reviewed commercial host, so the map is auditable. */
  commercial_map_usage: Array<{ host: string; name: string; events: number }>;
  proposals: ProposalRow[];
  triage: TriageRow[];
};

export const getOrganiserGap = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<OrganiserGap> => {
    await requireAdminOrThrow();

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const since = new Date(now - DEMAND_WINDOW_DAYS * 86_400_000).toISOString();

    const [events, clubs, searchClicks, reminders] = await Promise.all([
      fetchFutureEvents(today),
      fetchActiveClubs(),
      supabaseAdmin
        .from("search_clicks")
        .select("clicked_slug")
        .gte("created_at", since)
        .limit(5000),
      supabaseAdmin
        .from("email_subscriptions")
        .select("event_id")
        .gte("created_at", since)
        .limit(5000),
    ]);

    for (const res of [searchClicks, reminders]) {
      if (res.error) throw new Error(res.error.message);
    }

    const clicksBySlug = new Map<string, number>();
    for (const c of searchClicks.data ?? []) {
      clicksBySlug.set(c.clicked_slug, (clicksBySlug.get(c.clicked_slug) ?? 0) + 1);
    }
    const remindersByEventId = new Map<string, number>();
    for (const r of reminders.data ?? []) {
      remindersByEventId.set(r.event_id, (remindersByEventId.get(r.event_id) ?? 0) + 1);
    }

    const clubIndex = buildClubHostIndex(clubs);

    // --- Cohorts ------------------------------------------------------------
    const cohorts = {
      ea_with_url: 0,
      ea_without_url: 0,
      runabc: 0,
      tra: 0,
      welsh_ni: 0,
      tbc_literal: 0,
      unknown_literal: 0,
      other_unnamed: 0,
    };
    let named = 0;

    for (const e of events) {
      if (!isUnnamedOrganiser(e.organiser)) {
        named += 1;
        continue;
      }
      if (e.organiser?.trim().toLowerCase() === "tbc") cohorts.tbc_literal += 1;
      else if (e.organiser?.trim().toLowerCase() === "unknown") cohorts.unknown_literal += 1;
      else if (e.source === "england-athletics") {
        if (e.organiser_url) cohorts.ea_with_url += 1;
        else cohorts.ea_without_url += 1;
      } else if (e.source === "runabc") cohorts.runabc += 1;
      else if (e.source === "tra") cohorts.tra += 1;
      else if (e.source === "welsh-athletics" || e.source === "athletics-ni") cohorts.welsh_ni += 1;
      else cohorts.other_unnamed += 1;
    }

    const totals: CohortTotals = {
      future_events: events.length,
      named,
      named_share_pct: events.length === 0 ? 0 : Math.round((named / events.length) * 100),
      unnamed_total: events.length - named,
      unnamed_with_organiser_url: events.filter(
        (e) => isUnnamedOrganiser(e.organiser) && Boolean(e.organiser_url),
      ).length,
      cohorts,
    };

    // --- Deterministic proposals ---------------------------------------------
    const commercialUsage = new Map<string, number>();
    const proposals: ProposalRow[] = [];

    for (const e of events) {
      const proposal = proposeOrganiser(
        { organiser: e.organiser, organiser_url: e.organiser_url },
        clubIndex,
      );
      if (!proposal) continue;

      const host = eventHost(e.organiser_url);
      if (proposal.basis === "commercial-map" && host) {
        commercialUsage.set(host, (commercialUsage.get(host) ?? 0) + 1);
      }

      const search_clicks = (e.slug && clicksBySlug.get(e.slug)) || 0;
      const reminder_requests = remindersByEventId.get(e.id) ?? 0;
      proposals.push({
        id: e.id,
        slug: e.slug,
        name: e.name,
        town: e.town,
        county: e.county,
        sort_date: e.sort_date,
        source: e.source,
        current: currentOrganiserLabel(e.organiser),
        proposal: {
          organiser: proposal.organiser,
          organiser_type: proposal.organiser_type,
          basis: proposal.basis,
        },
        organiser_url: e.organiser_url,
        search_clicks,
        reminder_requests,
        demand_signals: search_clicks + reminder_requests,
      });
    }

    // Highest demonstrated runner demand first, soonest race next.
    proposals.sort(
      (a, b) =>
        b.demand_signals - a.demand_signals ||
        (a.sort_date ?? "").localeCompare(b.sort_date ?? "") ||
        a.name.localeCompare(b.name),
    );

    // --- Manual triage queue: literal TBC / Unknown rows ----------------------
    const triage: TriageRow[] = events
      .filter((e) => ["tbc", "unknown"].includes(e.organiser?.trim().toLowerCase() ?? ""))
      .map((e) => {
        const search_clicks = (e.slug && clicksBySlug.get(e.slug)) || 0;
        const reminder_requests = remindersByEventId.get(e.id) ?? 0;
        return {
          id: e.id,
          slug: e.slug,
          name: e.name,
          town: e.town,
          county: e.county,
          sort_date: e.sort_date,
          current: currentOrganiserLabel(e.organiser),
          entry_url: e.entry_url,
          entry_host: eventHost(e.entry_url),
          search_clicks,
          reminder_requests,
          demand_signals: search_clicks + reminder_requests,
        };
      })
      .sort(
        (a, b) =>
          b.demand_signals - a.demand_signals ||
          Number(Boolean(b.entry_url)) - Number(Boolean(a.entry_url)) ||
          (a.sort_date ?? "").localeCompare(b.sort_date ?? ""),
      );

    return {
      generated_at: new Date().toISOString(),
      totals,
      commercial_map_usage: Object.keys(COMMERCIAL_ORGANISER_HOSTS)
        .map((host) => ({
          host,
          name: COMMERCIAL_ORGANISER_HOSTS[host],
          events: commercialUsage.get(host) ?? 0,
        }))
        .sort((a, b) => b.events - a.events || a.host.localeCompare(b.host)),
      proposals: proposals.slice(0, data.limit),
      triage: triage.slice(0, data.limit),
    };
  });
