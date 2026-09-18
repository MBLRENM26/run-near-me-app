import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";
import {
  REVENUE_THRESHOLDS,
  countOrganisersWithReach,
  entryPlatformExposure,
  evaluateGates,
  organiserReach,
  type Gate,
  type OrganiserEventRow,
  type OrganiserReachRow,
  type PlatformExposure,
} from "@/lib/revenue-evidence";

/**
 * Read-only revenue-evidence layer for the admin area.
 *
 * Answers "which revenue route could plausibly pay?" from data we already
 * hold. No writes, no schema change, no public projection change, no pricing.
 *
 * Deliberate limitation: outbound hand-offs are only recorded in the external
 * analytics product, not in the database, so organiser reach uses on-site
 * demand signals (search-result clicks and reminder requests) as a proxy and
 * says so. Entry-platform figures are link inventory, not click share.
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

type FutureEventRow = {
  id: string;
  slug: string | null;
  name: string;
  organiser: string | null;
  organiser_url: string | null;
  entry_url: string | null;
  governance: string | null;
  sort_date: string | null;
  region: string | null;
};

const FUTURE_COLUMNS =
  "id, slug, name, organiser, organiser_url, entry_url, governance, sort_date, region";

async function fetchFutureEvents(today: string): Promise<FutureEventRow[]> {
  const rows: FutureEventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(FUTURE_COLUMNS)
      .eq("status", "ACTIVE")
      .gte("sort_date", today)
      .order("sort_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as FutureEventRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export type RunnerDemand = {
  searches: number;
  searches_with_no_results: number;
  search_clicks: number;
  click_through_pct: number;
  reminder_requests: number;
  distinct_runner_emails: number;
  repeat_runner_emails: number;
  reminder_requests_all_time: number;
};

export type RevenueEvidence = {
  generated_at: string;
  window_days: number;
  thresholds: typeof REVENUE_THRESHOLDS;
  runner: RunnerDemand;
  organisers: {
    total_with_label: number;
    with_reach: number;
    min_signals: number;
    rows: OrganiserReachRow[];
  };
  platforms: {
    total_events_on_platforms: number;
    top_share_pct: number;
    rows: PlatformExposure[];
  };
  inventory: {
    future_events: number;
    discovery_eligible: number;
    without_organiser_link: number;
    next_90_days: number;
  };
  gates: Gate[];
};

export const getRevenueEvidence = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ windowDays: z.number().int().min(7).max(365).default(90) }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<RevenueEvidence> => {
    await requireAdminOrThrow();

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const since = new Date(now - data.windowDays * 86_400_000).toISOString();
    const in90 = new Date(now + 90 * 86_400_000).toISOString().slice(0, 10);

    const [events, searchLogs, searchClicks, reminders, remindersAllTime] = await Promise.all([
      fetchFutureEvents(today),
      supabaseAdmin
        .from("search_logs")
        .select("id, results_count")
        .gte("created_at", since)
        .limit(5000),
      supabaseAdmin
        .from("search_clicks")
        .select("clicked_slug")
        .gte("created_at", since)
        .limit(5000),
      supabaseAdmin
        .from("email_subscriptions")
        .select("email, event_id")
        .gte("created_at", since)
        .limit(5000),
      supabaseAdmin.from("email_subscriptions").select("id", { count: "exact", head: true }),
    ]);

    for (const res of [searchLogs, searchClicks, reminders, remindersAllTime]) {
      if (res.error) throw new Error(res.error.message);
    }

    // --- Runner demand -----------------------------------------------------
    const logs = searchLogs.data ?? [];
    const clicks = searchClicks.data ?? [];
    const reminderRows = reminders.data ?? [];

    const clicksBySlug = new Map<string, number>();
    for (const c of clicks) {
      clicksBySlug.set(c.clicked_slug, (clicksBySlug.get(c.clicked_slug) ?? 0) + 1);
    }

    const remindersByEventId = new Map<string, number>();
    const byEmail = new Map<string, Set<string>>();
    for (const r of reminderRows) {
      remindersByEventId.set(r.event_id, (remindersByEventId.get(r.event_id) ?? 0) + 1);
      const key = r.email.toLowerCase();
      const set = byEmail.get(key) ?? new Set<string>();
      set.add(r.event_id);
      byEmail.set(key, set);
    }
    const repeatRunnerEmails = [...byEmail.values()].filter((s) => s.size > 1).length;

    const runner: RunnerDemand = {
      searches: logs.length,
      searches_with_no_results: logs.filter((l) => (l.results_count ?? 0) === 0).length,
      search_clicks: clicks.length,
      click_through_pct: logs.length === 0 ? 0 : Math.round((clicks.length / logs.length) * 100),
      reminder_requests: reminderRows.length,
      distinct_runner_emails: byEmail.size,
      repeat_runner_emails: repeatRunnerEmails,
      reminder_requests_all_time: remindersAllTime.count ?? 0,
    };

    // --- Organiser reach ---------------------------------------------------
    const organiserRows: OrganiserEventRow[] = events.map((e) => ({
      id: e.id,
      slug: e.slug,
      organiser: e.organiser,
      organiser_url: e.organiser_url,
      entry_url: e.entry_url,
      discoverable: hasOrganiserOwnedLink(e.entry_url, e.organiser_url),
    }));
    const reach = organiserReach(organiserRows, clicksBySlug, remindersByEventId);

    // --- Entry-platform exposure ------------------------------------------
    const exposure = entryPlatformExposure(
      events.map((e) => ({ entry_url: e.entry_url, organiser_url: e.organiser_url })),
    );

    // --- Inventory --------------------------------------------------------
    const discoveryEligible = organiserRows.filter((r) => r.discoverable).length;

    const gates = evaluateGates({
      reminderRequests: runner.reminder_requests,
      repeatRunnerEmails: runner.repeat_runner_emails,
      organisersWithReach: countOrganisersWithReach(reach),
      topPlatformSharePct: exposure.topSharePct,
      // Pageviews live in the external analytics product, not the database.
      // Unknown beats false precision.
      monthlyPageviews: null,
    });

    return {
      generated_at: new Date().toISOString(),
      window_days: data.windowDays,
      thresholds: REVENUE_THRESHOLDS,
      runner,
      organisers: {
        total_with_label: reach.length,
        with_reach: countOrganisersWithReach(reach),
        min_signals: REVENUE_THRESHOLDS.organiserDemandSignals,
        rows: reach.slice(0, 50),
      },
      platforms: {
        total_events_on_platforms: exposure.total,
        top_share_pct: exposure.topSharePct,
        rows: exposure.platforms.slice(0, 20),
      },
      inventory: {
        future_events: events.length,
        discovery_eligible: discoveryEligible,
        without_organiser_link: events.length - discoveryEligible,
        next_90_days: events.filter((e) => e.sort_date && e.sort_date <= in90).length,
      },
      gates,
    };
  });
