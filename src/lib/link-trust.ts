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
 *                      link, named on the page, or asserted in structured
 *                      data. Kept in the DB for internal use only.
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

/**
 * Third-party entry / booking / timing platforms. NOT aggregators — these
 * host real event-specific entry pages, so `classifyEventLink` still
 * returns `entry` / `organiser-site` for them and the event page may
 * render "Enter now" pointing at one. They just don't count as the
 * organiser's OWN website, so `hasOrganiserOwnedLink` rejects them —
 * which means events whose ONLY link is on one of these platforms are
 * excluded from discovery surfaces (homepage, region / distance landing
 * pages, "other races near you", etc.).
 *
 * See mem://constraints/scraped-data-trust.
 */
const ENTRY_PLATFORM_HOSTS = [
  "sientries.co.uk",
  "eventrac.co.uk",
  "entrycentral.com",
  "racebest.com",
  "bookitzone.com",
  "evententry.co.uk",
  "evensplits.events",
  "race-nation.co.uk",
  "runnation.co.uk",
  "totalracetiming.co.uk",
  "ukrunningevents.co.uk",
  "nice-work.org.uk",
  "raceforlife.cancerresearchuk.org",
  // Entry / results platform used by athletics events (data.opentrack.run).
  "opentrack.run",

  // Governing-body multi-tenant entry platforms (covers e.g.
  // scottishathletics.justgo.com, englandathletics.sport80.com, plus any
  // other club/federation tenants on the same platform).
  "justgo.com",
  "sport80.com",
];

function isAggregatorHost(host: string): boolean {
  return AGGREGATOR_HOSTS.some((a) => host === a || host.endsWith(`.${a}`));
}

export function isEntryPlatformHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.replace(/^www\./, "").toLowerCase();
  return ENTRY_PLATFORM_HOSTS.some((p) => h === p || h.endsWith(`.${p}`));
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

/**
 * Discovery-grade trust check. True iff at least one of `entryUrl` /
 * `organiserUrl` resolves to a link on the organiser's OWN site — not
 * an aggregator, not a third-party entry / booking / timing platform.
 *
 * Use for discovery surfaces only (homepage curated lists, region /
 * distance landing pages, "other races near you", etc.). Event-page
 * CTAs keep using `classifyEventLink` / `isTrustedLink` directly so
 * "Enter now → sientries" etc. still works for runners who land on a
 * specific event page.
 */
export function hasOrganiserOwnedLink(
  entryUrl: string | null | undefined,
  organiserUrl: string | null | undefined,
): boolean {
  for (const raw of [entryUrl, organiserUrl]) {
    const link = classifyEventLink(raw);
    if (!isTrustedLink(link)) continue;
    if (isEntryPlatformHost(link.host)) continue;
    return true;
  }
  return false;
}

/** Governance tags that carry enough trust on their own to admit an
 * event whose only external link sits on a third-party entry platform
 * (sientries, racebest, sport80, justgo, …). A permit from one of these
 * bodies means the event is real and sanctioned — the link platform
 * is just plumbing. Aggregator-only links are still rejected. */
const TRUSTED_GOVERNANCE = new Set([
  "england_athletics",
  "scottish_athletics",
  "welsh_athletics",
  "athletics_ni",
  "tra",
]);

/**
 * Discovery gate used across homepage / region / distance / cross-link
 * surfaces. Admits an event when EITHER:
 *   - it has an organiser-owned link (see hasOrganiserOwnedLink), OR
 *   - it carries a trusted governance tag AND has at least one trusted
 *     event-specific link (entry-platform links count here; aggregator
 *     links never do).
 *
 * Event detail-page CTAs keep using classifyEventLink / isTrustedLink
 * directly, so "Enter now → sientries" still works for people who land
 * on a specific event page.
 */
export function hasDiscoverableLink(
  entryUrl: string | null | undefined,
  organiserUrl: string | null | undefined,
  governance: string | null | undefined,
): boolean {
  if (hasOrganiserOwnedLink(entryUrl, organiserUrl)) return true;
  if (!governance || !TRUSTED_GOVERNANCE.has(governance)) return false;
  for (const raw of [entryUrl, organiserUrl]) {
    const link = classifyEventLink(raw);
    if (link.kind === "entry") return true;
  }
  return false;
}
