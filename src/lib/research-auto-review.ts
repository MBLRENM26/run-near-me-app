import { classifyEventLink, isEntryPlatformHost, isTrustedLink } from "./link-trust";

/** Rule version recorded on every automatic acceptance; bump when rules change. */
export const AUTO_RULE = "auto:rule-v1";

/** Never auto-accepted: too time-sensitive, or needs reuse permission. */
export const NEVER_AUTO_FIELDS = new Set(["entries_status", "course_map_url"]);

/** Caveats that describe the fact's shape, not a problem with it. */
const BENIGN_CAVEATS = new Set([
  "Edition and source evidence require human review",
  "Qualified or distance-specific value; retain wording",
  "One part of a multi-part fact (e.g. per distance)",
  "Repeats an earlier research batch",
  "Licence not independently verified",
]);

export type ReviewableFact = {
  field: string;
  source_url: string;
  evidence_quote: string;
  researcher_confidence: string;
  match_state: string;
  caveats: unknown;
  occurrence_snapshot: unknown;
};

export type Triage =
  | { kind: "auto" }
  | { kind: "parked"; reason: string }
  | { kind: "needs_you"; reason: string };

const plain: Record<string, string> = {
  "Differs from an earlier research batch": "Different from an earlier research pass",
  "Stored occurrence date uncertain or inconsistent": "Our race date is estimated, so we can't confirm it's the same year",
  "Slug year differs from stored edition": "Looks like a different year's race",
  "Ambiguous boolean": "Answer wasn't a clear yes or no",
  "Unknown value": "No value given",
  "Pending or unknown licence": "Licence is pending or unclear",
};

export function triageFact(f: ReviewableFact): Triage {
  if (NEVER_AUTO_FIELDS.has(f.field)) return { kind: "parked", reason: f.field === "entries_status" ? "Entry status changes too often to rely on" : "Course map needs permission to reuse" };
  if (f.match_state === "unresolved") return { kind: "parked", reason: "Not matched to a race we list" };
  const caveats = Array.isArray(f.caveats) ? f.caveats.map(String) : [];
  const problems = caveats.filter((c) => !BENIGN_CAVEATS.has(c));
  if (f.match_state === "quarantined" || problems.length) {
    const reason = problems.map((c) => plain[c] ?? c).join("; ") || "Contradicts another fact in the same research";
    return { kind: "needs_you", reason };
  }
  if (f.researcher_confidence !== "verified") return { kind: "needs_you", reason: "Researcher wasn't sure" };
  if (!f.evidence_quote.trim()) return { kind: "needs_you", reason: "No quote from the source" };
  const link = classifyEventLink(f.source_url);
  if (!isTrustedLink(link) || isEntryPlatformHost(link.host)) return { kind: "needs_you", reason: "Source isn't the organiser's own website" };
  const snap = (f.occurrence_snapshot ?? null) as { date_from?: string | null; date_is_estimated?: boolean | null } | null;
  if (!snap?.date_from || snap.date_is_estimated) return { kind: "needs_you", reason: "Our race date is estimated, so we can't confirm it's the same year" };
  return { kind: "auto" };
}
