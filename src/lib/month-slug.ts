// Month-year slug helpers for /running-events/{month}-{year} and
// /{distance}-races/{month}-{year} landing pages.

import type { MonthKey } from "@/lib/month-filter";

const MONTH_LONG = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_LONG_TITLE = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parse "july-2026" → { year, month0, key }. Returns null if malformed. */
export function parseMonthSlug(
  slug: string,
): { year: number; month0: number; key: MonthKey } | null {
  const m = /^([a-z]+)-(\d{4})$/.exec(slug.toLowerCase());
  if (!m) return null;
  const idx = MONTH_LONG.indexOf(m[1]);
  if (idx === -1) return null;
  const year = Number(m[2]);
  if (year < 2024 || year > 2099) return null;
  const key: MonthKey = `${year}-${String(idx + 1).padStart(2, "0")}`;
  return { year, month0: idx, key };
}

/** "2026-07" → "july-2026" */
export function monthSlugFromKey(key: MonthKey): string {
  const [yr, mo] = key.split("-");
  return `${MONTH_LONG[Number(mo) - 1]}-${yr}`;
}

export function formatMonthYearLong(key: MonthKey): string {
  const [yr, mo] = key.split("-");
  return `${MONTH_LONG_TITLE[Number(mo) - 1]} ${yr}`;
}

/** Return the next N month keys starting from today (UTC), inclusive. */
export function nextNMonthKeys(n: number, now: Date = new Date()): MonthKey[] {
  const out: MonthKey[] = [];
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth(); // 0-11
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m === 12) { m = 0; y++; }
  }
  return out;
}
