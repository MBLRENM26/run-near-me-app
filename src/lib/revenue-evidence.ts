/**
 * Pure aggregation + decision-gate logic for the admin "Revenue evidence" page.
 *
 * Nothing here reads the network or writes anything. It exists so the
 * thresholds that decide whether a revenue route is worth building are
 * explicit, reviewable and unit-tested — rather than buried in a component.
 *
 * Evidence discipline (RENM): every figure derived here is an *observed
 * demand signal* from our own data. A search click, an outbound hand-off or a
 * reminder request is NOT an entry, NOT revenue and NOT organiser value.
 */

import { classifyEventLink, isEntryPlatformHost } from "@/lib/link-trust";

/**
 * Starting thresholds. Deliberately in one place so they can be argued with
 * and adjusted without touching query or UI code.
 */
export const REVENUE_THRESHOLDS = {
  /** Reminder/alert requests in the window before a paid runner tier is worth prototyping. */
  reminderRequestsPerWindow: 25,
  /** Distinct emails that asked about more than one race (repeat intent). */
  repeatRunnerEmails: 10,
  /** Organisers that each clear `organiserDemandSignals` in the window. */
  organisersWithReach: 10,
  /** Demand signals (search clicks + reminder requests) for one organiser in the window. */
  organiserDemandSignals: 15,
  /** Share of entry-platform links held by a single platform before affiliate outreach. */
  affiliatePlatformSharePct: 50,
  /** Monthly genuine pageviews before contextual ads are worth revisiting. */
  adsMonthlyPageviews: 50_000,
} as const;

export type Gate = {
  id: "subscription" | "listings" | "affiliate" | "ads";
  label: string;
  metric: string;
  value: number;
  threshold: number;
  met: boolean;
  /** What this does and does not prove. */
  note: string;
};

export type GateInput = {
  reminderRequests: number;
  repeatRunnerEmails: number;
  organisersWithReach: number;
  topPlatformSharePct: number;
  monthlyPageviews: number | null;
};

export function evaluateGates(input: GateInput): Gate[] {
  const t = REVENUE_THRESHOLDS;
  return [
    {
      id: "subscription",
      label: "Runner subscription worth prototyping",
      metric: `${input.reminderRequests} reminder requests, ${input.repeatRunnerEmails} repeat runners`,
      value: input.reminderRequests,
      threshold: t.reminderRequestsPerWindow,
      met:
        input.reminderRequests >= t.reminderRequestsPerWindow &&
        input.repeatRunnerEmails >= t.repeatRunnerEmails,
      note: "Requests show interest in being told about a race. They are not paid intent.",
    },
    {
      id: "listings",
      label: "Paid / featured listing worth a manual sales test",
      metric: `${input.organisersWithReach} organisers with ${t.organiserDemandSignals}+ demand signals`,
      value: input.organisersWithReach,
      threshold: t.organisersWithReach,
      met: input.organisersWithReach >= t.organisersWithReach,
      note: "Demand signals are on-site clicks and reminder requests, not entries or revenue.",
    },
    {
      id: "affiliate",
      label: "Affiliate worth approaching a platform",
      metric: `${input.topPlatformSharePct}% of entry-platform links on one platform`,
      value: input.topPlatformSharePct,
      threshold: t.affiliatePlatformSharePct,
      met: input.topPlatformSharePct >= t.affiliatePlatformSharePct,
      note: "Link inventory share, not click share. Confirms who to talk to first, nothing more.",
    },
    {
      id: "ads",
      label: "Contextual ads worth revisiting",
      metric:
        input.monthlyPageviews === null
          ? "no pageview figure supplied"
          : `${input.monthlyPageviews.toLocaleString()} monthly pageviews`,
      value: input.monthlyPageviews ?? 0,
      threshold: t.adsMonthlyPageviews,
      met: (input.monthlyPageviews ?? 0) >= t.adsMonthlyPageviews,
      note: "Privacy page currently promises no advertising cookies — any ads must be contextual.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Entry-platform exposure
// ---------------------------------------------------------------------------

export type LinkRow = { entry_url: string | null; organiser_url: string | null };

export type PlatformExposure = {
  host: string;
  events: number;
  sharePct: number;
};

/**
 * Count future events whose rendered outbound link sits on a third-party
 * entry/booking platform, grouped by platform host. Inventory only — we hold
 * no per-link click log in the database.
 */
export function entryPlatformExposure(rows: LinkRow[]): {
  platforms: PlatformExposure[];
  total: number;
  topSharePct: number;
} {
  const counts = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const hosts = new Set<string>();
    for (const raw of [row.entry_url, row.organiser_url]) {
      const link = classifyEventLink(raw);
      if (!link.host) continue;
      if (link.kind === "untrusted" || link.kind === "invalid") continue;
      if (!isEntryPlatformHost(link.host)) continue;
      hosts.add(link.host);
    }
    if (hosts.size === 0) continue;
    total += 1;
    for (const host of hosts) counts.set(host, (counts.get(host) ?? 0) + 1);
  }

  const platforms = [...counts.entries()]
    .map(([host, events]) => ({
      host,
      events,
      sharePct: total === 0 ? 0 : Math.round((events / total) * 100),
    }))
    .sort((a, b) => b.events - a.events || a.host.localeCompare(b.host));

  return { platforms, total, topSharePct: platforms[0]?.sharePct ?? 0 };
}

// ---------------------------------------------------------------------------
// Organiser reach
// ---------------------------------------------------------------------------

export type OrganiserEventRow = {
  id: string;
  slug: string | null;
  organiser: string | null;
  organiser_url: string | null;
  entry_url: string | null;
  discoverable: boolean;
};

export type OrganiserReachRow = {
  organiser: string;
  future_events: number;
  discoverable_events: number;
  search_clicks: number;
  reminder_requests: number;
  demand_signals: number;
};

/**
 * Group future events by a stable organiser label, attaching on-site demand
 * signals per event. Falls back to the organiser-owned host when the
 * `organiser` field is empty, and skips rows with neither.
 */
export function organiserReach(
  rows: OrganiserEventRow[],
  clicksBySlug: Map<string, number>,
  remindersByEventId: Map<string, number>,
): OrganiserReachRow[] {
  const byOrganiser = new Map<string, OrganiserReachRow>();

  for (const row of rows) {
    const label = organiserLabel(row);
    if (!label) continue;

    let bucket = byOrganiser.get(label);
    if (!bucket) {
      bucket = {
        organiser: label,
        future_events: 0,
        discoverable_events: 0,
        search_clicks: 0,
        reminder_requests: 0,
        demand_signals: 0,
      };
      byOrganiser.set(label, bucket);
    }

    bucket.future_events += 1;
    if (row.discoverable) bucket.discoverable_events += 1;
    bucket.search_clicks += (row.slug && clicksBySlug.get(row.slug)) || 0;
    bucket.reminder_requests += remindersByEventId.get(row.id) ?? 0;
  }

  const out = [...byOrganiser.values()];
  for (const o of out) o.demand_signals = o.search_clicks + o.reminder_requests;
  out.sort(
    (a, b) =>
      b.demand_signals - a.demand_signals ||
      b.future_events - a.future_events ||
      a.organiser.localeCompare(b.organiser),
  );
  return out;
}

export function organiserLabel(row: OrganiserEventRow): string | null {
  const named = row.organiser?.trim();
  if (named) return named;
  for (const raw of [row.organiser_url, row.entry_url]) {
    const link = classifyEventLink(raw);
    if (!link.host) continue;
    if (link.kind === "untrusted" || link.kind === "invalid") continue;
    if (isEntryPlatformHost(link.host)) continue;
    return link.host;
  }
  return null;
}

export function countOrganisersWithReach(
  rows: OrganiserReachRow[],
  minSignals: number = REVENUE_THRESHOLDS.organiserDemandSignals,
): number {
  return rows.filter((r) => r.demand_signals >= minSignals).length;
}
