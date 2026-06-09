/**
 * Site-wide link-trust policy for scraped event URLs.
 *
 * Scraped data routinely contains aggregator listing pages, bare organiser
 * homepages and malformed URLs. Every external URL shown anywhere on the
 * site must pass through `classifyEventLink` first:
 *
 * - `entry`          — event-specific page on a non-aggregator host.
 *                      May be shown as "Enter now" and asserted in JSON-LD.
 * - `organiser-site` — homepage of a non-aggregator host. May be shown as
 *                      "Visit organiser website", never as "Enter now".
 * - `untrusted`      — aggregator/listing-site URL. NEVER rendered as a
 *                      link or asserted in structured data; at most named
 *                      as plain text ("Listed via runabc.co.uk").
 * - `invalid`        — missing or unparseable. Never rendered.
 */

export type EventLinkKind = "entry" | "organiser-site" | "untrusted" | "invalid";

export type ClassifiedLink = {
  kind: EventLinkKind;
  /** Normalised absolute URL (protocol repaired), or null when invalid. */
  href: string | null;
  /** Hostname without leading www., or null when invalid. */
  host: string | null;
};

/** Aggregator / listing sites — never the event's official website. */
const AGGREGATOR_HOSTS = [
  "runabc.co.uk",
  "runabc.scot",
  "timeoutdoors.com",
  "findarace.com",
  "letsdothis.com",
  "runningcalendar.co.uk",
  "runningcalendar.ie",
  "englandathletics.org",
  "scottishathletics.org.uk",
  "welshathletics.org",
  "athleticsni.org",
];

function isAggregatorHost(host: string): boolean {
  return AGGREGATOR_HOSTS.some((a) => host === a || host.endsWith(`.${a}`));
}

/** Repair protocol-less URLs ("www.runbournemouth.com") and validate. */
export function normalizeUrl(raw: string | null | undefined): URL | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

export function classifyEventLink(raw: string | null | undefined): ClassifiedLink {
  const u = normalizeUrl(raw);
  if (!u) return { kind: "invalid", href: null, host: null };

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (isAggregatorHost(host)) {
    return { kind: "untrusted", href: u.href, host };
  }

  // Bare homepage (no path) — an organiser's site, not an entry page.
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { kind: "organiser-site", href: u.href, host };
  }

  return { kind: "entry", href: u.href, host };
}

/** True when the link may be rendered as a clickable official link. */
export function isTrustedLink(link: ClassifiedLink): boolean {
  return link.kind === "entry" || link.kind === "organiser-site";
}
