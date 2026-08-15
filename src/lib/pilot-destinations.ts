/**
 * RENM outbound-wayfinding / source-graph pilot (CODE-ONLY, fail-closed).
 *
 * Two reviewed pilot occurrences get an explicit, human-reviewed
 * "Where to go next" destination manifest. Nothing here is inferred:
 * a manifest is returned ONLY when the event id matches a pilot AND every
 * accepted field value matches exactly. Any drift (re-sync, edit, different
 * row) returns an empty array and the page keeps its legacy CTA behaviour.
 *
 * Boundary rules:
 * - `source` / `source_url` are read here for verification only. The only
 *   source URL that may ever reach a public payload is the reviewed TRA
 *   licence record, which is an intentional public licence destination.
 *   The England Athletics source URL is NEVER emitted.
 * - Trust gates (`classifyEventLink` / `isTrustedLink`) still apply to every
 *   emitted destination.
 */

import type { DestinationRole } from "@/lib/destination-role";
import type { EventCtaLinkType } from "@/lib/event-ctas";
import { classifyEventLink, isTrustedLink } from "@/lib/link-trust";

export type DestinationRoleKind = "entry" | "official_details" | "licence";

export interface PublicDestination {
  role: DestinationRoleKind;
  /** Human-readable role label shown before the click. */
  roleLabel: string;
  provider: string;
  action: string;
  supportingText?: string;
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
  organiser_url?: string | null;
  entry_url?: string | null;
  source?: string | null;
  source_url?: string | null;
  governance?: string | null;
}

const ROLE_LABELS: Record<DestinationRoleKind, string> = {
  entry: "Entry",
  official_details: "Official details",
  licence: "Licence",
};

const ROLE_PRECEDENCE: Record<DestinationRoleKind, number> = {
  entry: 0,
  official_details: 1,
  licence: 2,
};

const LINK_TYPES: Record<DestinationRoleKind, EventCtaLinkType> = {
  entry: "entry",
  official_details: "organiser-other",
  licence: "organiser-other",
};

type Candidate = Omit<PublicDestination, "roleLabel" | "host" | "linkType">;

interface PilotSpec {
  accepted: {
    organiser: string;
    organiser_url: string;
    entry_url: string;
    source: string;
    source_url: string;
    governance: string;
  };
  destinations: Candidate[];
}

const SATURN_ID = "adb1a4f8-504d-44bd-99d0-94d8b6346542";
const FNUL_ID = "2eda5231-ac29-4b4d-bebd-e4f98dd24bf6";

const SATURN_OCCURRENCE =
  "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793";
const TRA_LICENCE_RECORD = "https://races.tra-uk.org/race-directory/view/7708";
const FNUL_HOMEPAGE = "https://www.fridaynightunderthelights5k.co.uk/";
const FNUL_OPENTRACK = "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/";

const PILOTS: Record<string, PilotSpec> = {
  [SATURN_ID]: {
    accepted: {
      organiser: "Saturn Running",
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
        href: SATURN_OCCURRENCE,
        destinationRole: "booking_destination",
      },
      {
        role: "licence",
        provider: "Trail Running Association",
        action: "View TRA permit 8570",
        href: TRA_LICENCE_RECORD,
        destinationRole: "licence_record",
      },
    ],
  },
  [FNUL_ID]: {
    accepted: {
      organiser: "Friday Night Under the Lights 5K",
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
        href: FNUL_OPENTRACK,
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Friday Night Under the Lights 5K",
        action: "Visit official race website",
        href: FNUL_HOMEPAGE,
        destinationRole: "official_information",
      },
    ],
  },
};

function normalizeForDedupe(href: string): string {
  return href.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Build the reviewed public destination manifest for a pilot event.
 * Returns `[]` for any non-pilot or drifted row.
 */
export function buildPilotDestinations(row: PilotEventRow | null | undefined): PublicDestination[] {
  if (!row?.id) return [];
  const spec = PILOTS[row.id];
  if (!spec) return [];

  const a = spec.accepted;
  const matches =
    (row.organiser ?? null) === a.organiser &&
    (row.organiser_url ?? null) === a.organiser_url &&
    (row.entry_url ?? null) === a.entry_url &&
    (row.source ?? null) === a.source &&
    (row.source_url ?? null) === a.source_url &&
    (row.governance ?? null) === a.governance;
  if (!matches) return [];

  const out: PublicDestination[] = [];
  const seen = new Map<string, DestinationRoleKind>();

  const ordered = [...spec.destinations].sort(
    (x, y) => ROLE_PRECEDENCE[x.role] - ROLE_PRECEDENCE[y.role],
  );

  for (const candidate of ordered) {
    const link = classifyEventLink(candidate.href);
    if (!isTrustedLink(link) || !link.href || !link.host) continue;
    const key = normalizeForDedupe(link.href);
    if (seen.has(key)) continue;
    seen.set(key, candidate.role);
    out.push({
      ...candidate,
      roleLabel: ROLE_LABELS[candidate.role],
      href: link.href,
      host: link.host,
      linkType: LINK_TYPES[candidate.role],
    });
  }

  return out;
}
