// Month-filter helpers and search-param validator shared by distance,
// region, and region×distance pages.

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "YYYY-MM" key, e.g. "2026-11". */
export type MonthKey = string;

const MONTH_RE = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === "string" && MONTH_RE.test(v);
}

export function eventMonthKey(e: {
  sort_date?: string | null;
}): MonthKey | null {
  if (!e.sort_date) return null;
  const s = e.sort_date;
  // sort_date is "YYYY-MM-DD" — just slice.
  if (s.length < 7) return null;
  const key = s.slice(0, 7);
  return MONTH_RE.test(key) ? key : null;
}

export function filterByMonth<T extends { sort_date?: string | null }>(
  events: T[],
  month: MonthKey | undefined,
): T[] {
  if (!month) return events;
  return events.filter((e) => eventMonthKey(e) === month);
}

function currentMonthKey(): MonthKey {
  const d = new Date();
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yr}-${mo}`;
}

/**
 * Build a sorted, deduped list of month keys present in `events`, restricted
 * to the current month onwards, capped at the next `maxMonths` months.
 */
export function availableMonths(
  events: { sort_date?: string | null }[],
  maxMonths = 12,
): MonthKey[] {
  const cutoff = currentMonthKey();
  const set = new Set<MonthKey>();
  for (const e of events) {
    const m = eventMonthKey(e);
    if (m && m >= cutoff) set.add(m);
  }
  return Array.from(set).sort().slice(0, maxMonths);
}

/** Short label, e.g. "Nov 2026". */
export function formatMonthLabel(m: MonthKey): string {
  const [yr, mo] = m.split("-");
  const idx = Number(mo) - 1;
  return `${MONTH_NAMES[idx]} ${yr}`;
}

/** Long label, e.g. "November 2026". */
export function formatMonthLabelLong(m: MonthKey): string {
  const [yr, mo] = m.split("-");
  const idx = Number(mo) - 1;
  return `${FULL_MONTH_NAMES[idx]} ${yr}`;
}

export type MonthSearch = { month?: MonthKey };

/** TanStack `validateSearch` for the month query param. */
export function monthSearchValidator(
  raw: Record<string, unknown>,
): MonthSearch {
  const v = raw.month;
  return isMonthKey(v) ? { month: v } : {};
}
