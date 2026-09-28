import { findWayfindingReview, type WayfindingRow } from "./wayfinding-reviews";

/** Legacy URL classification, with occurrence-specific reviewed exceptions.
 * A path does not prove booking availability or official ownership. Reviewed
 * destinations carry explicit roles; unknown listings remain excluded.
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

/** Entry platforms require governance evidence or a matching occurrence review
 * for discovery. Provider identity alone does not admit an event. */
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
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") || u.username || u.password) return null;
    // External links only. Block local hosts, IP literals and malformed hosts.
    const host = u.hostname.toLowerCase();
    if (
      !/^[a-z0-9.-]+$/.test(host) ||
      !/[a-z]{2,}$/.test(host) ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost")
    )
      return null;
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

  // A bare payment link does not establish who receives it or which race.
  if (isPaymentHost(host)) return { kind: "untrusted", href: u.href, host };

  // Bare homepage (no path) — an organiser's site, not an entry page.
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { kind: "organiser-site", href: u.href, host };
  }

  return { kind: "entry", href: u.href, host };
}

/** True when the legacy link may be rendered with a neutral destination label. */
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
 * "Check entries at SI Entries" etc. still works for runners who land on a
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
 *   - an occurrence-specific reviewed destination matches its ID, date and URLs, OR
 *   - it has an organiser-owned link (see hasOrganiserOwnedLink), OR
 *   - it carries a trusted governance tag AND has at least one trusted
 *     event-specific link (entry-platform links count here; aggregator
 *     links never do).
 *
 * Event detail-page CTAs keep using classifyEventLink / isTrustedLink
 * directly, so "Check entries at SI Entries" still works for people who land
 * on a specific event page.
 */
export function hasDiscoverableLink(
  entryUrl: string | null | undefined,
  organiserUrl: string | null | undefined,
  governance: string | null | undefined,
  occurrence?: WayfindingRow,
): boolean {
  if (
    occurrence &&
    findWayfindingReview({ ...occurrence, entry_url: entryUrl, organiser_url: organiserUrl })
  )
    return true;
  if (hasOrganiserOwnedLink(entryUrl, organiserUrl)) return true;
  if (!governance || !TRUSTED_GOVERNANCE.has(governance)) return false;
  for (const raw of [entryUrl, organiserUrl]) {
    const link = classifyEventLink(raw);
    if (link.kind === "entry") return true;
  }
  return false;
}

export function isPaymentHost(host: string): boolean {
  return ["paypal.com", "paypal.me", "buy.stripe.com"].some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
}

export function entryProviderLabel(host: string): string {
  const labels: Record<string, string> = {
    "sientries.co.uk": "SI Entries",
    "entrycentral.com": "EntryCentral",
    "racebest.com": "RaceBest",
    "eventrac.co.uk": "Eventrac",
    "sport80.com": "Sport:80",
    "justgo.com": "JustGo",
    "opentrack.run": "OpenTrack",
  };
  return Object.entries(labels).find(([h]) => host === h || host.endsWith(`.${h}`))?.[1] ?? host;
}
