/**
 * RENM outbound-wayfinding / source-graph showcase (CODE-ONLY, fail-closed).
 *
 * A small set of reviewed occurrences get an explicit, human-reviewed
 * "Where to go next" destination manifest. Nothing here is inferred:
 * a manifest is returned ONLY when the event id matches a reviewed occurrence
 * AND every accepted field value matches exactly. Any drift (re-sync, edit,
 * different row) returns an empty array and the page keeps its legacy CTA
 * behaviour.
 *
 * Boundary rules:
 * - `source` / `source_url` are read here for verification only. The only
 *   source URLs that may ever reach a public payload are the reviewed TRA
 *   licence records and the reviewed England Athletics governing-body
 *   listing, which are intentional public destinations. Private provenance
 *   (England Athletics search URLs used as provenance, runABC) is NEVER
 *   emitted.
 * - Trust gates (`classifyEventLink` / `isTrustedLink`) still apply to every
 *   emitted destination, except for explicitly reviewed governing-body
 *   listings, which are human-reviewed public destinations on a host the
 *   generic policy treats as an aggregator. Those still must be valid
 *   absolute http(s) URLs.
 */

import type { DestinationRole } from "@/lib/destination-role";
import type { EventCtaLinkType } from "@/lib/event-ctas";
import { classifyEventLink, isTrustedLink, normalizeUrl } from "@/lib/link-trust";

export type DestinationRoleKind =
  | "results"
  | "entry"
  | "official_details"
  | "licence"
  | "governing_listing"
  | "athlete_information"
  | "course";

export interface PublicDestination {
  role: DestinationRoleKind;
  /** Human-readable role label — accessible text only, never a visible heading. */
  roleLabel: string;
  provider: string;
  action: string;
  supportingText?: string;
  /**
   * Optional reviewed presentation override for the short visible signpost
   * label (e.g. Hertfordshire's two distinct reviewed course maps).
   * Presentation only: never affects URL, role, provider or analytics.
   */
  shortLabel?: string;
  href: string;
  host: string;
  /** Analytics-only role for the `Outbound Click` event. */
  destinationRole: DestinationRole;
  /** Preserved `link_type` prop values for existing Plausible breakdowns. */
  linkType: EventCtaLinkType;
}

export interface PilotEventRow {
  id: string;
  organiser?: string | null;
  organiser_type?: string | null;
  organiser_url?: string | null;
  entry_url?: string | null;
  source?: string | null;
  source_url?: string | null;
  governance?: string | null;
}

const ROLE_LABELS: Record<DestinationRoleKind, string> = {
  results: "Results",
  entry: "Entry",
  official_details: "Official details",
  licence: "Licence",
  governing_listing: "Governing-body listing",
  athlete_information: "Athlete information",
  course: "Course",
};

const ROLE_PRECEDENCE: Record<DestinationRoleKind, number> = {
  results: 0,
  entry: 1,
  official_details: 2,
  licence: 3,
  governing_listing: 4,
  athlete_information: 5,
  course: 6,
};

const LINK_TYPES: Record<DestinationRoleKind, EventCtaLinkType> = {
  results: "organiser-other",
  entry: "entry",
  official_details: "organiser-other",
  licence: "organiser-other",
  governing_listing: "organiser-other",
  athlete_information: "organiser-other",
  course: "organiser-other",
};

export type Candidate = Omit<PublicDestination, "roleLabel" | "host" | "linkType">;

/**
 * A reviewed candidate. `reviewedListingExempt` may only be set on a
 * `governing_listing` candidate: a human-reviewed public governing-body
 * listing on a host the generic link-trust policy treats as an aggregator.
 */
export type ReviewedCandidate = Candidate & { reviewedListingExempt?: boolean };

interface PilotSpec {
  accepted: {
    organiser: string | null;
    organiser_type: string;
    organiser_url: string;
    entry_url: string;
    source: string;
    source_url: string;
    governance: string;
  };
  /**
   * TRANSITION ONLY. Additional exact `(organiser, organiser_type)` pairs
   * accepted as whole pairs — never cross-pairs, spelling variants or any
   * third value. Retained so the reviewed signposts survive a deploy that
   * precedes the audited organiser-identity row update. Remove in a
   * separately verified cleanup once the production mutation is stable.
   */
  acceptedIdentityAlternatives?: Array<{ organiser: string | null; organiser_type: string }>;
  destinations: ReviewedCandidate[];
}


const SATURN_ID = "adb1a4f8-504d-44bd-99d0-94d8b6346542";
const FNUL_ID = "2eda5231-ac29-4b4d-bebd-e4f98dd24bf6";
const DUCKY_ID = "7a2160ea-3b20-431e-9a9c-69048237686f";
const SEDGEFIELD_ID = "c8eea9cc-0d2a-4db4-8bac-a7040b43dd59";
const HERTS_ID = "ab287a93-9062-4d67-9ccf-eb489bcee7bb";

const SATURN_OCCURRENCE =
  "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793";
const TRA_LICENCE_RECORD = "https://races.tra-uk.org/race-directory/view/7708";
const FNUL_HOMEPAGE = "https://www.fridaynightunderthelights5k.co.uk/";
const FNUL_OPENTRACK = "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/";

const DUCKY_TRA_RECORD = "https://races.tra-uk.org/race-directory/view/7709";
const DUCKY_OCCURRENCE = "https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932";
const DUCKY_COURSE = `${DUCKY_OCCURRENCE}/route-maps`;

const SEDGEFIELD_OFFICIAL = "https://sedgefieldharriers.co.uk/sedgefield-serpentine/";
const SEDGEFIELD_ENTRY = "https://englandathletics.sport80.com/public/wizard/e/30356";
const SEDGEFIELD_EA_LISTING =
  "https://www.englandathletics.org/runevents/search/?query=Sedgefield%20Serpentine%202026";
const SEDGEFIELD_ATHLETE_INFO =
  "https://sedgefieldharriers.co.uk/wp-content/uploads/2026/06/Website-Race-Information-for-athletes-2026.pdf";
const SEDGEFIELD_COURSE =
  "https://sedgefieldharriers.co.uk/wp-content/uploads/2026/06/Serpentine-route-2026.pdf";

const HERTS_OFFICIAL = "https://www.hertshalf.com/";
const HERTS_ENTRY =
  "https://www.runthrough.co.uk/event/hertfordshire-half-marathon-10k-november-2026";

const PILOTS: Record<string, PilotSpec> = {
  [SATURN_ID]: {
    accepted: {
      organiser: "Saturn Running",
      organiser_type: "unknown",
      organiser_url: SATURN_OCCURRENCE,
      entry_url: SATURN_OCCURRENCE,
      source: "tra",
      source_url: TRA_LICENCE_RECORD,
      governance: "tra",
    },
    destinations: [
      {
        role: "entry",
        provider: "Saturn Running",
        action: "View entry options",
        supportingText: "Entry powered by Eventrac",
        shortLabel: "Enter with Saturn Running",
        href: SATURN_OCCURRENCE,
        destinationRole: "booking_destination",
      },
      {
        role: "licence",
        provider: "Trail Running Association",
        action: "View TRA permit 8570",
        shortLabel: "View TRA permit 8570",
        href: TRA_LICENCE_RECORD,
        destinationRole: "licence_record",
      },
      // Conservative official-details candidate. `organiser_url` is the same
      // occurrence URL as `entry_url`, so entry > official_details dedupe
      // removes this candidate and the public output keeps two destinations.
      {
        role: "official_details",
        provider: "Saturn Running",
        action: "View official race details",
        href: SATURN_OCCURRENCE,
        destinationRole: "official_information",
      },
    ],
  },
  [FNUL_ID]: {
    accepted: {
      organiser: "Friday Night Under the Lights 5K",
      organiser_type: "unknown",
      organiser_url: FNUL_HOMEPAGE,
      entry_url: FNUL_OPENTRACK,
      source: "england-athletics",
      source_url:
        "https://www.englandathletics.org/runevents/search/?query=Friday%20Night%20Under%20the%20Lights%20Race%20Series%2026",
      governance: "england_athletics",
    },
    destinations: [
      {
        role: "entry",
        provider: "OpenTrack",
        action: "View entry status on OpenTrack",
        supportingText: "Specific 11 September 2026 occurrence",
        shortLabel: "Enter via OpenTrack",
        href: FNUL_OPENTRACK,
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Friday Night Under the Lights 5K",
        action: "Visit official race website",
        shortLabel: "FNUL race website",
        href: FNUL_HOMEPAGE,
        destinationRole: "official_information",
      },
    ],
  },
  [DUCKY_ID]: {
    accepted: {
      organiser: null,
      organiser_type: "unknown",
      organiser_url: DUCKY_TRA_RECORD,
      entry_url: "",
      source: "tra",
      source_url: DUCKY_TRA_RECORD,
      governance: "tra",
    },
    destinations: [
      {
        role: "entry",
        provider: "Saturn Running",
        action: "Enter event",
        supportingText: "Entry powered by Eventrac",
        shortLabel: "Enter with Saturn Running",
        href: DUCKY_OCCURRENCE,
        destinationRole: "booking_destination",
      },
      {
        role: "licence",
        provider: "Trail Running Association",
        action: "View approved TRA permit 8571",
        shortLabel: "View TRA permit 8571",
        href: DUCKY_TRA_RECORD,
        destinationRole: "licence_record",
      },
      {
        role: "course",
        provider: "Saturn Running",
        action: "View course map",
        shortLabel: "Course map",
        href: DUCKY_COURSE,
        destinationRole: "official_information",
      },
      // Same occurrence URL as the entry destination — dedupes behind entry.
      {
        role: "official_details",
        provider: "Saturn Running",
        action: "View official race details",
        href: DUCKY_OCCURRENCE,
        destinationRole: "official_information",
      },
    ],
  },
  [SEDGEFIELD_ID]: {
    accepted: {
      organiser: null,
      organiser_type: "governing_body",
      organiser_url: SEDGEFIELD_OFFICIAL,
      entry_url: SEDGEFIELD_ENTRY,
      source: "england-athletics",
      source_url: SEDGEFIELD_EA_LISTING,
      governance: "england_athletics",
    },
    // TRANSITION ONLY: pre-mutation identity state is the `accepted` pair above
    // (organiser null + governing_body); the audited QL1 data update will move
    // this row to Sedgefield Harriers + club. Both whole pairs are accepted so
    // the reviewed signposts survive deploy-before-row-update. Remove this
    // alternative in a separately verified cleanup after the production
    // mutation is stable.
    acceptedIdentityAlternatives: [{ organiser: "Sedgefield Harriers", organiser_type: "club" }],

    destinations: [
      {
        role: "entry",
        provider: "Sport:80",
        action: "Enter event",
        shortLabel: "Enter via Sport:80",
        href: SEDGEFIELD_ENTRY,
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Sedgefield Harriers",
        action: "Visit official race page",
        shortLabel: "Sedgefield Harriers website",
        href: SEDGEFIELD_OFFICIAL,
        destinationRole: "official_information",
      },
      {
        role: "governing_listing",
        provider: "England Athletics",
        action: "View England Athletics listing",
        shortLabel: "England Athletics listing",
        href: SEDGEFIELD_EA_LISTING,
        destinationRole: "official_information",
        reviewedListingExempt: true,
      },
      {
        role: "athlete_information",
        provider: "Sedgefield Harriers",
        action: "Read 2026 athlete information",
        shortLabel: "Athlete information",
        href: SEDGEFIELD_ATHLETE_INFO,
        destinationRole: "official_information",
      },
      {
        role: "course",
        provider: "Sedgefield Harriers",
        action: "View 2026 course map",
        shortLabel: "Course map",
        href: SEDGEFIELD_COURSE,
        destinationRole: "official_information",
      },
    ],
  },
  [HERTS_ID]: {
    accepted: {
      organiser: "RunThrough",
      organiser_type: "commercial",
      organiser_url: HERTS_OFFICIAL,
      entry_url: HERTS_ENTRY,
      source: "runabc",
      source_url: "https://runabc.co.uk/hertfordshire-half-marathon",
      governance: "unknown",
    },
    // Reviewed correction: the Strava route destinations were removed. The
    // 10K / Half Marathon courses are served on-page by the embedded
    // "Course and elevation" component, which stays unchanged.
    destinations: [
      {
        role: "entry",
        provider: "RunThrough",
        action: "Enter event",
        shortLabel: "Enter with RunThrough",
        href: HERTS_ENTRY,
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Hertfordshire Half Marathon",
        action: "Visit official event website",
        shortLabel: "Herts Half website",
        href: HERTS_OFFICIAL,
        destinationRole: "official_information",
      },
    ],
  },
};

function normalizeForDedupe(href: string): string {
  return href.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Build the reviewed public destination manifest for a reviewed occurrence.
 * Returns `[]` for any non-showcase or drifted row.
 */
export function buildPilotDestinations(row: PilotEventRow | null | undefined): PublicDestination[] {
  if (!row?.id) return [];
  const spec = PILOTS[row.id];
  if (!spec) return [];

  const a = spec.accepted;
  const matches =
    (row.organiser ?? null) === a.organiser &&
    (row.organiser_type ?? null) === a.organiser_type &&
    (row.organiser_url ?? null) === a.organiser_url &&
    (row.entry_url ?? null) === a.entry_url &&
    (row.source ?? null) === a.source &&
    (row.source_url ?? null) === a.source_url &&
    (row.governance ?? null) === a.governance;
  if (!matches) return [];

  return resolvePilotCandidates(spec.destinations);
}

/**
 * Apply role precedence, the shared trust gate and URL dedupe to reviewed
 * candidates.
 *
 * Exported for tests only — server-side, no runtime behaviour beyond what
 * `buildPilotDestinations` already does.
 */
export function resolvePilotCandidates(candidates: ReviewedCandidate[]): PublicDestination[] {
  const out: PublicDestination[] = [];
  const seen = new Set<string>();

  const ordered = [...candidates].sort((x, y) => ROLE_PRECEDENCE[x.role] - ROLE_PRECEDENCE[y.role]);

  for (const candidate of ordered) {
    const { reviewedListingExempt, ...rest } = candidate;
    const link = classifyEventLink(rest.href);
    const exempt = reviewedListingExempt === true && rest.role === "governing_listing";
    let href = link.href;
    let host = link.host;
    if (exempt) {
      const u = normalizeUrl(rest.href);
      if (!u) continue;
      href = u.href;
      host = u.hostname.replace(/^www\./, "").toLowerCase();
    } else if (!isTrustedLink(link) || !link.href || !link.host) {
      continue;
    }
    if (!href || !host) continue;
    const key = normalizeForDedupe(href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...rest,
      roleLabel: ROLE_LABELS[rest.role],
      href,
      host,
      linkType: LINK_TYPES[rest.role],
    });
  }

  return out;
}

export interface PanelLayout {
  /** Clickable dominant destination, or null when the race is completed and no reviewed results destination exists. */
  primary: PublicDestination | null;
  secondary: PublicDestination[];
  /** True when the race has passed and no reviewed results destination exists. */
  awaitingResults: boolean;
}

/**
 * Split a reviewed manifest into the dominant primary action and the compact
 * secondary grid, honouring the post-race lifecycle:
 * - upcoming: entry is primary (results, if ever reviewed, stays primary too).
 * - past: the entry destination is suppressed entirely; a reviewed results
 *   destination becomes primary, otherwise the panel shows a non-clickable
 *   "Race completed / Results coming soon" status.
 */
export function resolvePanelLayout(
  destinations: PublicDestination[],
  { isPast = false }: { isPast?: boolean } = {},
): PanelLayout {
  const usable = isPast ? destinations.filter((d) => d.role !== "entry") : destinations;
  const results = usable.find((d) => d.role === "results") ?? null;
  const primary = isPast ? results : (results ?? usable.find((d) => d.role === "entry") ?? null);
  const secondary = usable.filter((d) => d !== primary);
  return { primary, secondary, awaitingResults: isPast && !results };
}

/**
 * Short visible signpost label. Presentation only — it never changes the
 * destination URL, reviewed role, provider or the analytics role.
 */
export function destinationLabel(d: PublicDestination): string {
  if (d.shortLabel) return d.shortLabel;
  switch (d.role) {
    case "entry":
      return "Enter race";
    case "official_details":
      return "Race website";
    case "licence":
      return d.provider === "Trail Running Association" ? "TRA permit" : "Permit";
    case "governing_listing":
      return d.provider === "England Athletics" ? "EA listing" : "Governing-body listing";
    case "athlete_information":
      return "Athlete info";
    case "course":
      return "Course map";
    case "results":
      return "Race results";
  }
}

/**
 * Accessible name: keeps role + provider context for screen readers while the
 * visible surface stays a short signpost label.
 */
export function destinationAccessibleName(d: PublicDestination): string {
  return `${destinationLabel(d)} — ${d.roleLabel}, ${d.provider} (${d.host}), opens in a new tab`;
}

/**
 * Count-aware secondary geometry. Every secondary signpost is equal height and
 * shape, and no layout ever leaves an empty placeholder cell.
 */
export function secondaryGridClass(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 sm:grid-cols-2";
    case 3:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case 4:
      return "grid-cols-1 sm:grid-cols-2";
    default:
      return "grid-cols-1 sm:grid-cols-2";
  }
}
