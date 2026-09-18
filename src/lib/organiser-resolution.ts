/**
 * Deterministic organiser-identity resolution for future events.
 *
 * Fills the gap behind the "TBC" bucket on the admin revenue page: most
 * future events have no organiser *name*, even when we hold the organiser's
 * own website. This module proposes `{ organiser, organiser_type }` from
 * deterministic evidence only — it never guesses, never touches the network
 * and never writes anything. Proposals are reviewed in the admin area and
 * applied later through a separately approved audited edit.
 *
 * Evidence rules:
 * - Club-domain match: the event's organiser_url host equals a club's
 *   website host. Strongest evidence — the club runs its own site.
 * - Commercial map: a small reviewed host → name map for recurring
 *   commercial organisers seen on England Athletics organiser URLs.
 * - Everything else (entry platforms, aggregators, missing URLs, already
 *   named organisers) produces NO proposal. Unknown beats false precision.
 */

import { classifyEventLink, isEntryPlatformHost } from "@/lib/link-trust";

/**
 * Reviewed commercial organiser domains. Keys are hosts exactly as
 * `classifyEventLink` normalises them (lowercase, no leading `www.`).
 *
 * Each name was verified against the live site's own title. Note that some
 * of these hosts are also classified as entry platforms by link-trust
 * (nice-work.org.uk, evensplits.events, runnation.co.uk): when the event's
 * *organiser_url* points at that company's own domain, the company IS the
 * organiser, so naming it is factual. Naming never changes link trust or
 * discovery eligibility — those keep using link-trunt rules unchanged.
 */
export const COMMERCIAL_ORGANISER_HOSTS: Record<string, string> = {
  "runthrough.co.uk": "RunThrough",
  "nice-work.org.uk": "Nice Work",
  "runforall.com": "Run For All",
  "atwevents.co.uk": "Active Training World",
  "runnation.co.uk": "Run Nation",
  "evensplits.events": "Even Splits",
};

/** Values stored in events.organiser that mean "we do not know". */
const UNNAMED_ORGANISER_VALUES = new Set(["tbc", "tba", "unknown", "n/a", "not known"]);

export function isUnnamedOrganiser(value: string | null | undefined): boolean {
  const trimmed = value?.trim().toLowerCase();
  return !trimmed || UNNAMED_ORGANISER_VALUES.has(trimmed);
}

/** Normalised host of a URL (lowercase, no www.), or null when invalid. */
export function eventHost(raw: string | null | undefined): string | null {
  const link = classifyEventLink(raw);
  return link.host;
}

export type ClubHost = { id: string; name: string; website_url: string | null };

/**
 * Index active clubs by their website host for exact-match lookup.
 * Hosts are normalised the same way as event hosts; one host may map to
 * several clubs (shared platforms) — the first in input order wins and
 * callers should treat ambiguous hosts as lower confidence.
 */
export function buildClubHostIndex(clubs: ClubHost[]): Map<string, ClubHost[]> {
  const index = new Map<string, ClubHost[]>();
  for (const club of clubs) {
    const host = eventHost(club.website_url ?? null);
    if (!host) continue;
    const bucket = index.get(host);
    if (bucket) bucket.push({ id: club.id, name: club.name, website_url: club.website_url });
    else index.set(host, [{ id: club.id, name: club.name, website_url: club.website_url }]);
  }
  return index;
}

export type OrganiserProposal = {
  organiser: string;
  organiser_type: "club" | "commercial";
  basis: "club-domain" | "commercial-map";
};

export type ProposeOrganiserInput = {
  /** Current organiser text — already-named events get no proposal. */
  organiser: string | null | undefined;
  /** The event's organiser-owned website, when we hold one. */
  organiser_url: string | null | undefined;
};

/**
 * Propose an organiser for an event.
 *
 * `clubHosts` is the index from `buildClubHostIndex`. Club-domain matches
 * take precedence over the commercial map (a specific club beats a generic
 * organiser brand). Aggregator and entry-platform hosts that are not in the
 * reviewed commercial map never produce a proposal.
 */
export function proposeOrganiser(
  input: ProposeOrganiserInput,
  clubHosts: Map<string, ClubHost[]>,
): OrganiserProposal | null {
  if (!isUnnamedOrganiser(input.organiser)) return null;

  const host = eventHost(input.organiser_url);
  if (!host) return null;

  const clubMatches = clubHosts.get(host);
  if (clubMatches && clubMatches.length > 0) {
    return {
      organiser: clubMatches[0].name,
      organiser_type: "club",
      basis: "club-domain",
    };
  }

  const commercialName = COMMERCIAL_ORGANISER_HOSTS[host];
  if (commercialName) {
    return { organiser: commercialName, organiser_type: "commercial", basis: "commercial-map" };
  }

  // Anything unreviewed — including entry platforms and aggregators —
  // stays unknown.
  return null;
}
