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

/** Rule v2: newer pass wins; a value found more than once is accepted. */
export const AUTO_RULE_V2 = "auto:rule-v2";
const DIFFERS = "Differs from an earlier research batch";
const SECOND_QUOTE = "Source page also gave a second supporting quote (not stored)";
const WRONG_YEAR = "Slug year differs from stored edition";

export type GroupFact = ReviewableFact & { id: string; raw_value: string; batch_created_at: string; reviewed: boolean };
export type GroupDecision = { accept: string[]; supersede: string[] };

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
const caveatsOf = (f: ReviewableFact) => (Array.isArray(f.caveats) ? f.caveats.map(String) : []);
const without = (f: ReviewableFact, drop: string[]) => ({ ...f, caveats: caveatsOf(f).filter((c) => !drop.includes(c)) });
const organiserOwned = (u: string) => { const l = classifyEventLink(u); return isTrustedLink(l) && !isEntryPlatformHost(l.host); };

/** Pure: decide one slug+field group. Human-reviewed facts are never touched. */
export function resolveGroup(facts: GroupFact[]): GroupDecision {
  const out: GroupDecision = { accept: [], supersede: [] };
  if (!facts.length || NEVER_AUTO_FIELDS.has(facts[0].field)) return out;
  const open = facts.filter((f) => !f.reviewed);
  // Corroboration: same value seen on 2+ distinct sources or passes.
  const byValue = new Map<string, GroupFact[]>();
  for (const f of facts) byValue.set(norm(f.raw_value), [...(byValue.get(norm(f.raw_value)) ?? []), f]);
  for (const same of byValue.values()) {
    const distinct = new Set(same.map((f) => `${f.source_url}|${f.batch_created_at}`)).size;
    if (distinct < 2 || !same.some((f) => organiserOwned(f.source_url))) continue;
    for (const f of same) {
      if (f.reviewed || caveatsOf(f).includes(WRONG_YEAR)) continue;
      const g = without(f, [SECOND_QUOTE, DIFFERS]);
      const t = triageFact(organiserOwned(f.source_url) ? g : { ...g, source_url: same.find((s) => organiserOwned(s.source_url))!.source_url });
      if (t.kind === "auto") out.accept.push(f.id);
    }
  }
  // Newer wins: newest batch's single value beats older differing values.
  const newest = [...facts].sort((a, b) => b.batch_created_at.localeCompare(a.batch_created_at))[0].batch_created_at;
  const latest = facts.filter((f) => f.batch_created_at === newest);
  const values = new Set(latest.map((f) => norm(f.raw_value)));
  if (values.size === 1) {
    const winner = latest.find((f) => !f.reviewed && triageFact(without(f, [DIFFERS, SECOND_QUOTE])).kind === "auto");
    const older = open.filter((f) => f.batch_created_at < newest && norm(f.raw_value) !== norm(winner?.raw_value ?? ""));
    if (winner && older.length) {
      if (!out.accept.includes(winner.id)) out.accept.push(winner.id);
      out.supersede.push(...older.map((f) => f.id));
    }
  }
  out.supersede = out.supersede.filter((id) => !out.accept.includes(id));
  return out;
}
