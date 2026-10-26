// Inline contextual internal links for event detail pages.
// Distributes link equity from event pages to the new month / distance-month
// / terrain hub landing pages. Pure helpers; UI lives in the route file.

import type { DistanceKey } from "@/lib/distance-filters";
import { monthSlugFromKey, formatMonthYearLong } from "@/lib/month-slug";
import type { MonthKey } from "@/lib/month-filter";

interface EventDateLike {
  date_from?: string | null;
  sort_date?: string | null;
  date_is_estimated?: boolean | null;
}

/** YYYY-MM month key for an event, only when the date is precise and parseable. */
function monthKeyForEvent(e: EventDateLike): MonthKey | null {
  if (e.date_is_estimated) return null;
  const raw = e.date_from ?? e.sort_date;
  if (!raw) return null;
  const dt = new Date(raw + (raw.length === 10 ? "T00:00:00Z" : ""));
  if (isNaN(dt.getTime())) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface MonthLink {
  slug: string; // e.g. "august-2026"
  label: string; // e.g. "August 2026"
}

/** /running-events/{month-year} link, or null when month is uncertain/past. */
export function monthLinkForEvent(
  e: EventDateLike,
  opts: { isPast: boolean },
): MonthLink | null {
  if (opts.isPast) return null;
  const key = monthKeyForEvent(e);
  if (!key) return null;
  return { slug: monthSlugFromKey(key), label: formatMonthYearLong(key) };
}

// Distance keys with a distance×month route. (Trail is intentionally excluded —
// no trail-running-events.$month.tsx route exists.)
const DISTANCE_MONTH_ROUTES: Partial<Record<DistanceKey, "/5k-races/$month" | "/10k-races/$month" | "/half-marathons/$month" | "/marathons/$month" | "/ultra-marathons/$month">> = {
  "5k": "/5k-races/$month",
  "10k": "/10k-races/$month",
  "half-marathon": "/half-marathons/$month",
  marathon: "/marathons/$month",
  ultra: "/ultra-marathons/$month",
};

const DISTANCE_SHORT_LABEL: Record<DistanceKey, string> = {
  "5k": "5K",
  "10k": "10K",
  "half-marathon": "half marathon",
  marathon: "marathon",
  trail: "trail race",
  ultra: "ultra",
};

export interface DistanceMonthLink {
  to: "/5k-races/$month" | "/10k-races/$month" | "/half-marathons/$month" | "/marathons/$month" | "/ultra-marathons/$month";
  params: { month: string };
  label: string; // e.g. "10K races in August 2026"
}

export function distanceMonthLinkForEvent(
  e: EventDateLike,
  distanceKey: DistanceKey | null | undefined,
  opts: { isPast: boolean },
): DistanceMonthLink | null {
  if (!distanceKey) return null;
  const to = DISTANCE_MONTH_ROUTES[distanceKey];
  if (!to) return null;
  const month = monthLinkForEvent(e, opts);
  if (!month) return null;
  return {
    to,
    params: { month: month.slug },
    label: `${DISTANCE_SHORT_LABEL[distanceKey]} races in ${month.label}`,
  };
}

export interface TerrainHubLink {
  to: "/road-races" | "/fell-races" | "/trail-running-events" | "/multi-terrain-races";
  label: string;
}

const TERRAIN_HUB: Record<string, TerrainHubLink> = {
  road: { to: "/road-races", label: "Road" },
  fell: { to: "/fell-races", label: "Fell" },
  trail: { to: "/trail-running-events", label: "Trail" },
  "multi-terrain": { to: "/multi-terrain-races", label: "Multi-terrain" },
};

/** Map an exact terrain tag to its hub link, or null when no hub matches. */
export function terrainHubFor(tag: string): TerrainHubLink | null {
  return TERRAIN_HUB[tag] ?? null;
}

export interface MonthBrowseLink {
  kind: "month" | "distance";
  label: string;
  count: number;
}

/**
 * "More races in …" links for an upcoming race page. Only months Google may
 * index (≥ MIN_INDEXABLE_MONTH_EVENTS) are linked; past or uncertain-date
 * races get nothing.
 */
export function monthBrowseLinks(
  e: EventDateLike,
  distanceKey: DistanceKey | null | undefined,
  opts: { isPast: boolean },
  counts: { month: number | null; distance: number | null },
  isIndexable: (n: number) => boolean,
): MonthBrowseLink[] {
  const month = monthLinkForEvent(e, opts);
  if (!month) return [];
  const out: MonthBrowseLink[] = [];
  if (counts.month != null && isIndexable(counts.month)) {
    out.push({ kind: "month", label: `All races in ${month.label}`, count: counts.month });
  }
  const dist = distanceMonthLinkForEvent(e, distanceKey, opts);
  if (dist && counts.distance != null && isIndexable(counts.distance)) {
    const short = DISTANCE_SHORT_LABEL[distanceKey as DistanceKey];
    const plural = short.charAt(0).toUpperCase() + short.slice(1) + (short.endsWith("K") ? " races" : "s");
    out.push({ kind: "distance", label: `${plural} in ${month.label}`, count: counts.distance });
  }
  return out;
}

/** Month key used for counting, exposed for the page loader. */
export function monthKeyForCounting(e: EventDateLike, opts: { isPast: boolean }): string | null {
  if (opts.isPast) return null;
  return monthKeyForEvent(e);
}
