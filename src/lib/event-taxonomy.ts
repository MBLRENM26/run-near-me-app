/**
 * Display maps for the Phase 2 taxonomy columns.
 *
 * Rules:
 * - `null` / "unknown" values return null so callers render nothing (no
 *   "Unknown" placeholders).
 * - Labels are hand-written and stable; scraped free-text never surfaces here.
 * - Tone classes drive the badge colour. "governance" flags trust, so the
 *   trusted variants get a solid primary look; "organiser_type" is neutral
 *   context; "race_profile" is a soft accent.
 */

export type Governance =
  | "england_athletics"
  | "scottish_athletics"
  | "welsh_athletics"
  | "athletics_ni"
  | "tra"
  | "arc"
  | "fra"
  | "wfra"
  | "sha"
  | "parkrun"
  | "unlicensed"
  | "unknown";

export type OrganiserType =
  | "club"
  | "commercial"
  | "charity"
  | "parkrun"
  | "community"
  | "governing_body"
  | "unknown";

export type RaceProfile =
  | "road_race"
  | "trail_race"
  | "fell_race"
  | "ultra"
  | "multi_terrain"
  | "track"
  | "cross_country"
  | "parkrun"
  | "virtual"
  | "other";

const GOVERNANCE_LABELS: Record<Governance, string | null> = {
  england_athletics: "England Athletics permitted",
  scottish_athletics: "Scottish Athletics permitted",
  welsh_athletics: "Welsh Athletics permitted",
  athletics_ni: "Athletics NI permitted",
  tra: "TRA permitted",
  arc: "ARC permitted",
  fra: "FRA permitted",
  wfra: "WFRA permitted",
  sha: "SHA permitted",
  parkrun: "parkrun event",
  unlicensed: "Unlicensed",
  unknown: null,
};

const ORGANISER_TYPE_LABELS: Record<OrganiserType, string | null> = {
  club: "Club-organised",
  commercial: "Commercial event",
  charity: "Charity event",
  parkrun: "parkrun",
  community: "Community race",
  governing_body: "Governing body",
  unknown: null,
};

const RACE_PROFILE_LABELS: Record<RaceProfile, string | null> = {
  road_race: "Road race",
  trail_race: "Trail race",
  fell_race: "Fell race",
  ultra: "Ultra",
  multi_terrain: "Multi-terrain",
  track: "Track",
  cross_country: "Cross-country",
  parkrun: "parkrun",
  virtual: "Virtual",
  other: null,
};

export function governanceLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return GOVERNANCE_LABELS[value as Governance] ?? null;
}

export function organiserTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return ORGANISER_TYPE_LABELS[value as OrganiserType] ?? null;
}

export function raceProfileLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return RACE_PROFILE_LABELS[value as RaceProfile] ?? null;
}

/**
 * Governance values considered trustworthy for discovery gating. A UKA/home-
 * nation permit or a TRA/ARC/FRA sanction implies the event is real and
 * organised to a known standard, even when the only entry link is on an
 * entry platform.
 */
export const TRUSTED_GOVERNANCE: readonly Governance[] = [
  "england_athletics",
  "scottish_athletics",
  "welsh_athletics",
  "athletics_ni",
  "tra",
  "arc",
  "fra",
  "wfra",
  "sha",
];

export function hasTrustedGovernance(value: string | null | undefined): boolean {
  if (!value) return false;
  return (TRUSTED_GOVERNANCE as readonly string[]).includes(value);
}

/** Options for the admin selects. Includes "unknown" as an explicit choice. */
export const GOVERNANCE_OPTIONS = Object.entries(GOVERNANCE_LABELS).map(
  ([value, label]) => ({ value, label: label ?? "Unknown" }),
);
export const ORGANISER_TYPE_OPTIONS = Object.entries(ORGANISER_TYPE_LABELS).map(
  ([value, label]) => ({ value, label: label ?? "Unknown" }),
);
export const RACE_PROFILE_OPTIONS = Object.entries(RACE_PROFILE_LABELS).map(
  ([value, label]) => ({ value, label: label ?? "Other" }),
);
