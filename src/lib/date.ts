// Date formatting helpers for event display.

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseISO(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(d + (d.length === 10 ? "T00:00:00Z" : ""));
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtFullUTC(dt: Date): string {
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function fmtMonthYearUTC(dt: Date): string {
  return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/**
 * Format an event date for display.
 * - both dates same: "Saturday 14 June 2026"
 * - date range (same month): "14–16 June 2026"
 * - date range (different months): "29 June – 1 July 2026"
 * - only sort_date with day-precision unclear: falls through to full format
 * - nothing parseable: returns date_raw (or empty string)
 */
export function formatEventDate(args: {
  date_from?: string | null;
  date_to?: string | null;
  sort_date?: string | null;
  date_raw?: string | null;
  date_is_estimated?: boolean | null;
}): string {
  // Month-only entries: never show a false precise day like "1 June" —
  // the stored date defaults to the 1st of the month.
  if (args.date_is_estimated) {
    const dt = parseISO(args.date_from) ?? parseISO(args.sort_date);
    if (dt) return `${fmtMonthYearUTC(dt)} (date TBC)`;
    const raw = args.date_raw?.trim();
    return raw ? `${raw} (date TBC)` : "";
  }

  const from = parseISO(args.date_from);
  const to = parseISO(args.date_to);

  if (from && to && from.getTime() !== to.getTime()) {
    const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
    const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
    if (sameMonth) {
      return `${from.getUTCDate()}–${to.getUTCDate()} ${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
    }
    if (sameYear) {
      return `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]} – ${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]} ${from.getUTCFullYear()}`;
    }
    return `${fmtFullUTC(from)} – ${fmtFullUTC(to)}`;
  }

  const single = from ?? to ?? parseISO(args.sort_date);
  if (single) return fmtFullUTC(single);

  return args.date_raw?.trim() ?? "";
}

/** Returns the year for an event's title, or empty string if unknown. */
export function eventYear(args: {
  date_from?: string | null;
  sort_date?: string | null;
}): string {
  const dt = parseISO(args.date_from) ?? parseISO(args.sort_date);
  return dt ? String(dt.getUTCFullYear()) : "";
}

/** ISO 8601 date string for schema.org, or null. */
export function isoDate(d: string | null | undefined): string | null {
  const dt = parseISO(d);
  return dt ? dt.toISOString().slice(0, 10) : null;
}
