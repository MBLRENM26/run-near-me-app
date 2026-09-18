/**
 * ORL Step 3 — manual "Accept & apply organiser".
 *
 * Pure decision layer mirroring the SQL contract of
 * public.accept_and_apply_organiser (see the dated migration). The database
 * function is the single atomic authority: it locks the link, validates the
 * transition, appends the accepted review row, flips the link to accepted,
 * projects events.organiser and writes one event_edits audit row.
 *
 * Doctrine (D74/D75):
 * - Only an `organises` link, still `proposed` or `reopened`, may project.
 * - A meaningful, conflicting organiser name blocks. NULL / blank / TBC /
 *   Unknown / already-equal are the only permitted prior values.
 * - organiser_club_id and organiser_type are never written here.
 * - Nothing is automated: one reviewed link, one explicit confirmation.
 */

/** Prior organiser values that carry no meaning and may be replaced. */
export const PLACEHOLDER_ORGANISERS = ["tbc", "tba", "unknown", "n/a", "na", "-", "none"];

export function isPlaceholderOrganiser(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return true;
  return PLACEHOLDER_ORGANISERS.includes(v);
}

export type ApplyBlockCode =
  | "relationship_not_organises"
  | "invalid_transition"
  | "organiser_conflict"
  | "already_applied";

export type ApplyDecision =
  | {
      allowed: true;
      /** Exact public change the confirmation must state. */
      previous_organiser: string | null;
      new_organiser: string;
      /** True when the event already carries the canonical name (no-op projection). */
      already_equal: boolean;
    }
  | { allowed: false; code: ApplyBlockCode; reason: string };

export type ApplyInput = {
  relationship: string;
  review_status: string;
  current_organiser: string | null;
  canonical_name: string;
};

/**
 * Decide whether an ORL link may be accepted AND projected onto the public
 * organiser field. Used for UI eligibility and confirmation copy; the database
 * function re-validates the same rules inside the transaction.
 */
export function canApplyOrganiser(input: ApplyInput): ApplyDecision {
  if (input.relationship !== "organises") {
    return {
      allowed: false,
      code: "relationship_not_organises",
      reason:
        "Only an `organises` relationship can change the public organiser. Other relationship types are reviewed normally and never touch the event.",
    };
  }

  if (input.review_status === "accepted") {
    return {
      allowed: false,
      code: "already_applied",
      reason: "This link is already accepted. Re-applying would change nothing.",
    };
  }

  if (input.review_status !== "proposed" && input.review_status !== "reopened") {
    return {
      allowed: false,
      code: "invalid_transition",
      reason: `A link with status ${input.review_status} cannot be accepted. Use the existing review history and reopen workflow.`,
    };
  }

  const current = (input.current_organiser ?? "").trim();
  const canonical = input.canonical_name.trim();
  const alreadyEqual = current.toLowerCase() === canonical.toLowerCase() && current.length > 0;

  if (!alreadyEqual && !isPlaceholderOrganiser(current)) {
    return {
      allowed: false,
      code: "organiser_conflict",
      reason: `This event already names a different organiser ("${current}"). Nothing is changed: resolve the conflict in the event editor or reject this link.`,
    };
  }

  return {
    allowed: true,
    previous_organiser: input.current_organiser,
    new_organiser: canonical,
    already_equal: alreadyEqual,
  };
}

/** Human-readable statement of the exact public change, for the confirmation. */
export function describeOrganiserProjection(
  previous: string | null | undefined,
  canonical: string,
): string {
  const from = (previous ?? "").trim();
  return `Current organiser ${from ? `"${from}"` : "blank"} → ${canonical}`;
}
