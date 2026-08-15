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

// Neutral association/body labels. `governance` alone records WHICH body the
// occurrence is associated with in our source data — it is not evidence that a
// permit was issued. The permit claim comes from `events.licensed` and is made
// only by `governanceDisplay()` below.
const GOVERNANCE_LABELS: Record<Governance, string | null> = {
  england_athletics: "England Athletics",
  scottish_athletics: "Scottish Athletics",
  welsh_athletics: "Welsh Athletics",
  athletics_ni: "Athletics NI",
  tra: "Trail Running Association",
  arc: "Association of Running Clubs",
  fra: "Fell Runners Association",
  wfra: "Welsh Fell Runners Association",
  sha: "Scottish Hill Runners",
  parkrun: "parkrun event",
  unlicensed: "Unlicensed",
  unknown: null,
};

/**
 * Label used ONLY when `licensed` is an exact, trimmed, case-insensitive
 * "true". Established acronyms are used for the permit assertion.
 */
const GOVERNANCE_PERMITTED_LABELS: Partial<Record<Governance, string>> = {
  england_athletics: "England Athletics permitted",
  scottish_athletics: "Scottish Athletics permitted",
  welsh_athletics: "Welsh Athletics permitted",
  athletics_ni: "Athletics NI permitted",
  tra: "TRA permitted",
  arc: "ARC permitted",
  fra: "FRA permitted",
  wfra: "WFRA permitted",
  sha: "SHA permitted",
};

/** True only for a trimmed, case-insensitive exact "true". Fails closed. */
export function isLicensedTrue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

export type GovernanceDisplay = {
  /** Null means: render no governance badge. */
  label: string | null;
  /** True only for an evidenced permit/trust assertion. */
  permitted: boolean;
};

/**
 * State-aware governance display. `licensed` values that are null, false,
 * malformed or legacy free-text (e.g. "UKA licence 31079") fail closed to the
 * neutral association label — the raw value is never displayed.
 */
export function governanceDisplay(
  governance: string | null | undefined,
  licensed: string | null | undefined,
): GovernanceDisplay {
  const neutral = governanceLabel(governance);
  if (!neutral) return { label: null, permitted: false };
  if (!isLicensedTrue(licensed)) return { label: neutral, permitted: false };
  const permittedLabel =
    GOVERNANCE_PERMITTED_LABELS[governance as Governance] ?? null;
  return permittedLabel
    ? { label: permittedLabel, permitted: true }
    : { label: neutral, permitted: false };
}


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
 *
 * QL1 scope note: discovery gating is intentionally NOT state-aware. This
 * list and `hasTrustedGovernance` are deliberately unchanged by the licence
 * display work — changing which events are discoverable is a separate,
 * separately approved package.
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
