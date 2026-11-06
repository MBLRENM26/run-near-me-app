import { Parser } from "htmlparser2";

export const COVERAGE_TRIAL_END = "2026-12-04T00:00:00.000Z";
export const COVERAGE_CALENDARS = [
  { label: "Run Happy Run Healthy", url: "https://runhappyrunhealthy.co.uk/events/", path: /^\/event\// },
  { label: "Nice Work", url: "https://www.nice-work.org.uk/races", path: /^\/e\// },
  { label: "Sporting Events UK", url: "https://www.sportingeventsuk.com/calendars/sport-events/", path: /^\/e\// },
  { label: "RunThrough", url: "https://www.runthrough.co.uk/calendar", path: /^\/event\// },
] as const;

export function trialActive(now: Date): boolean {
  return now.getTime() < Date.parse(COVERAGE_TRIAL_END);
}

export function canonicalCoverageUrl(value: string): string {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch { return ""; }
}

export type CalendarLink = { url: string; title: string };

/** Parse only bounded same-host event links; never execute HTML or retain it. */
export function extractCalendarLinks(html: string, calendarUrl: string): CalendarLink[] {
  const calendar = COVERAGE_CALENDARS.find((source) => source.url === calendarUrl);
  if (!calendar) throw new Error("Calendar is not approved");
  if (html.length > 1_000_000) throw new Error("Calendar exceeds size limit");
  const links = new Map<string, CalendarLink>();
  let current: CalendarLink | null = null;
  let ignoredDepth = 0;
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "script" || name === "style") ignoredDepth++;
      if (name !== "a" || ignoredDepth || !attrs.href) return;
      try {
        const url = new URL(attrs.href, calendar.url);
        if (url.protocol !== "https:" || url.hostname !== new URL(calendar.url).hostname
          || url.username || url.password || !calendar.path.test(url.pathname)) return;
        url.search = ""; url.hash = "";
        current = { url: url.href, title: "" };
      } catch { current = null; }
    },
    ontext(text) { if (current && !ignoredDepth) current.title = `${current.title} ${text}`.slice(0, 400); },
    onclosetag(name) {
      if ((name === "script" || name === "style") && ignoredDepth) ignoredDepth--;
      if (name !== "a" || !current) return;
      const title = current.title.replace(/\s+/g, " ").trim().slice(0, 180);
      if (title && links.size < 500) links.set(canonicalCoverageUrl(current.url), { url: current.url, title });
      current = null;
    },
  });
  parser.write(html); parser.end();
  return Array.from(links.values());
}

/** Disappearance is not cancellation; unmatched links are research leads only. */
export function calendarDelta(links: CalendarLink[], knownUrls: string[], previousUrls: string[]) {
  const known = new Set(knownUrls.map(canonicalCoverageUrl).filter(Boolean));
  const previous = new Set(previousUrls.map(canonicalCoverageUrl));
  return links.filter((link) => !known.has(canonicalCoverageUrl(link.url)))
    .map((link) => ({ ...link, newlySeen: !previous.has(canonicalCoverageUrl(link.url)) }));
}

export type AcceptedAliasFact = { field: string; raw_value: string; checked_at: string; id: string };
export function latestAliasFacts(rows: AcceptedAliasFact[]): AcceptedAliasFact[] {
  const latest = new Map<string, AcceptedAliasFact>();
  for (const row of rows) {
    const old = latest.get(row.field);
    if (!old || `${row.checked_at}:${row.id}` > `${old.checked_at}:${old.id}`) latest.set(row.field, row);
  }
  return Array.from(latest.values());
}