// Date helpers for the "this weekend" / "next weekend" landing pages.
// Pure functions — shared by the server fn and the page component.

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type WeekendWhich = "this" | "next";

export type WeekendRange = {
  /** "YYYY-MM-DD" — Saturday */
  satISO: string;
  /** "YYYY-MM-DD" — Sunday */
  sunISO: string;
  /** "YYYY-MM-DD" — Friday (one day before Sat). Used in copy only. */
  friISO: string;
};

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Return the Saturday + Sunday for the relevant weekend.
 *
 * "this" weekend:
 *   - Mon (1) – Fri (5): the upcoming Saturday/Sunday
 *   - Sat (6): today + tomorrow
 *   - Sun (0): yesterday + today
 *
 * "next" weekend = this weekend + 7 days.
 *
 * Uses UTC throughout — matches the rest of the codebase, which stores
 * sort_date as a date-only string and compares via lexical ISO.
 */
export function getWeekendRange(
  which: WeekendWhich,
  now: Date = new Date(),
): WeekendRange {
  const todayISO = now.toISOString().slice(0, 10);
  const dow = now.getUTCDay(); // 0=Sun, 1=Mon..6=Sat
  let daysToSat: number;
  if (dow === 6) daysToSat = 0;
  else if (dow === 0) daysToSat = -1;
  else daysToSat = 6 - dow;

  const offset = daysToSat + (which === "next" ? 7 : 0);
  const satISO = addDaysISO(todayISO, offset);
  const sunISO = addDaysISO(satISO, 1);
  const friISO = addDaysISO(satISO, -1);
  return { satISO, sunISO, friISO };
}

/** "Sat 27 Jun" style label. */
export function formatWeekendDay(iso: string, opts?: { short?: boolean }): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const month = opts?.short ? MONTHS_SHORT[m - 1] : MONTHS_LONG[m - 1];
  return `${dayName} ${d} ${month}`;
}

/** "Fri 26 – Sun 28 Jun 2026" — compact range used in headings/meta. */
export function formatWeekendRange(r: WeekendRange): string {
  const [yF, mF, dF] = r.friISO.split("-").map(Number);
  const [yS, mS, dS] = r.sunISO.split("-").map(Number);
  const friDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(yF, mF - 1, dF)).getUTCDay()
  ];
  const sunDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(yS, mS - 1, dS)).getUTCDay()
  ];
  const sameMonth = mF === mS && yF === yS;
  if (sameMonth) {
    return `${friDay} ${dF} – ${sunDay} ${dS} ${MONTHS_SHORT[mS - 1]} ${yS}`;
  }
  return `${friDay} ${dF} ${MONTHS_SHORT[mF - 1]} – ${sunDay} ${dS} ${MONTHS_SHORT[mS - 1]} ${yS}`;
}
