// Shared, pure "month summary" built only from stored structured fields.
// Reused by month pages now; designed for reuse by region pages, the
// Explorer, MCP and distribution later. No prose, only counts.

export type SummaryInput = {
  id: string;
  sort_date: string | null;
  date_is_estimated?: boolean | null;
  region: string | null;
  terrain_tags?: string[] | null;
};

export type DayCount = { date: string; count: number };
export type WeekendBucket = {
  /** Saturday ISO date that anchors the weekend. */
  saturday: string;
  sunday: string;
  saturdayCount: number;
  sundayCount: number;
};
export type LabelCount = { label: string; count: number };

export type MonthSummary = {
  total: number;
  confirmed: number;
  estimated: number;
  byDay: DayCount[];
  weekends: WeekendBucket[];
  byRegion: LabelCount[];
  byTerrain: LabelCount[];
  courseMapCount: number;
};

/** Pages below this are kept out of search (noindex + not in sitemap). */
export const MIN_INDEXABLE_MONTH_EVENTS = 3;

export function isIndexableMonth(total: number): boolean {
  return total >= MIN_INDEXABLE_MONTH_EVENTS;
}

const TERRAIN_LABELS: Record<string, string> = {
  road: "Road",
  trail: "Trail",
  "multi-terrain": "Multi-terrain",
  fell: "Fell",
  "cross-country": "Cross country",
  track: "Track",
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sortCounts(m: Map<string, number>): LabelCount[] {
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Weekend (Sat+Sun) a date belongs to, anchored on its Saturday.
 * Returns null for Mon–Fri.
 */
export function weekendSaturday(date: string): string | null {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const dow = d.getUTCDay();
  if (dow === 6) return date;
  if (dow === 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    return isoDay(d);
  }
  return null;
}

/** All Saturdays whose weekend touches the given month ("YYYY-MM"). */
function monthWeekends(monthKey: string): { saturday: string; sunday: string }[] {
  const [y, m] = monthKey.split("-").map(Number);
  const out: { saturday: string; sunday: string }[] = [];
  const d = new Date(Date.UTC(y, m - 1, 1));
  // include a Sunday-1st (its Saturday is in the previous month)
  if (d.getUTCDay() === 0) d.setUTCDate(0);
  while (true) {
    if (d.getUTCDay() === 6) {
      const sun = new Date(d);
      sun.setUTCDate(sun.getUTCDate() + 1);
      const satKey = isoDay(d);
      const sunKey = isoDay(sun);
      if (satKey.slice(0, 7) !== monthKey && sunKey.slice(0, 7) !== monthKey) {
        if (satKey.slice(0, 7) > monthKey) break;
      } else {
        out.push({ saturday: satKey, sunday: sunKey });
      }
      d.setUTCDate(d.getUTCDate() + 7);
    } else {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    if (isoDay(d).slice(0, 7) > monthKey) break;
  }
  return out;
}

export function buildMonthSummary(
  monthKey: string,
  events: SummaryInput[],
  courseMapEventIds: ReadonlySet<string> = new Set(),
): MonthSummary {
  const day = new Map<string, number>();
  const region = new Map<string, number>();
  const terrain = new Map<string, number>();
  let estimated = 0;
  let courseMapCount = 0;

  for (const e of events) {
    if (e.date_is_estimated) estimated++;
    else if (e.sort_date && e.sort_date.slice(0, 7) === monthKey) {
      day.set(e.sort_date, (day.get(e.sort_date) ?? 0) + 1);
    }
    if (e.region) region.set(e.region, (region.get(e.region) ?? 0) + 1);
    const seen = new Set<string>();
    for (const t of e.terrain_tags ?? []) {
      const label = TERRAIN_LABELS[t];
      if (label && !seen.has(label)) {
        seen.add(label);
        terrain.set(label, (terrain.get(label) ?? 0) + 1);
      }
    }
    if (courseMapEventIds.has(e.id)) courseMapCount++;
  }

  const weekends = monthWeekends(monthKey).map((w) => ({
    ...w,
    saturdayCount: day.get(w.saturday) ?? 0,
    sundayCount: day.get(w.sunday) ?? 0,
  }));

  return {
    total: events.length,
    confirmed: events.length - estimated,
    estimated,
    byDay: [...day.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    weekends,
    byRegion: sortCounts(region),
    byTerrain: sortCounts(terrain),
    courseMapCount,
  };
}

/** Previous / next "YYYY-MM". */
export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Upcoming event counts per month ("YYYY-MM"), from fromMonth onward, oldest first. */
export function countByMonth(
  events: { sort_date: string | null }[],
  fromMonth: string,
  maxMonths = 12,
): LabelCount[] {
  const m = new Map<string, number>();
  for (const e of events) {
    const k = e.sort_date?.slice(0, 7);
    if (!k || !/^\d{4}-\d{2}$/.test(k) || k < fromMonth) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, maxMonths)
    .map(([label, count]) => ({ label, count }));
}
