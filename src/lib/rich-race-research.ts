import Papa from "papaparse";

export const richRaceFields = ["start_time", "chip_timed", "course_profile", "total_climb_m", "surface", "laps", "cut_off", "min_age", "wheelchair_friendly", "buggy_friendly", "dogs_allowed", "canicross", "parking", "public_transport", "ugr_licence", "entries_status", "course_map_url"] as const;
const booleanFields = new Set(["chip_timed", "wheelchair_friendly", "buggy_friendly", "dogs_allowed", "canicross"]);
export type CandidateValue = string | number | boolean | null;
export function typeRichFact(field: string, raw: string): { value: CandidateValue; caveats: string[] } {
  if (!raw.trim()) return { value: null, caveats: ["Unknown value"] };
  if (booleanFields.has(field)) {
    if (raw === "yes" || raw === "no") return { value: raw === "yes", caveats: [] };
    return { value: null, caveats: ["Ambiguous boolean"] };
  }
  if (["min_age", "laps", "total_climb_m"].includes(field)) {
    if (/^\d+$/.test(raw)) return { value: Number(raw), caveats: [] };
    return { value: raw, caveats: ["Qualified or distance-specific value; retain wording"] };
  }
  if (field === "ugr_licence") return { value: raw, caveats: ["Licence not independently verified", ...(/pending|TBC|applied/i.test(raw) ? ["Pending or unknown licence"] : [])] };
  if (field === "course_map_url") return { value: raw, caveats: ["Reproduction permission and edition not checked"] };
  if (field === "entries_status") return { value: raw, caveats: ["Time-sensitive observation; not current entry availability"] };
  return { value: raw, caveats: [] };
}
export function csvRows(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error("CSV is malformed; no rows imported");
  return parsed.data;
}
export function validateRichResearch(factsCsv: string, evidenceCsv: string) {
  const facts = csvRows(factsCsv), evidence = csvRows(evidenceCsv);
  const bySlug = new Map<string, Record<string, string>>();
  for (const row of facts) {
    if (!row.slug || bySlug.has(row.slug)) throw new Error("Missing or duplicate race slug");
    bySlug.set(row.slug, row);
  }
  const seen = new Set<string>();
  const assertions = evidence.map((row) => {
    if (!richRaceFields.some((f) => f === row.field)) throw new Error("Unsupported research field");
    if (!row.evidence_quote?.trim() || row.evidence_quote.length > 240) throw new Error("Missing or excessive evidence quote");
    const url = new URL(row.source_url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid evidence URL");
    if (!/^\d{4}-\d{2}-\d{2}T/.test(row.checked_at) || !Number.isFinite(Date.parse(row.checked_at)) || Date.parse(row.checked_at) > Date.now() + 300000) throw new Error("Invalid research check time");
    const key = JSON.stringify([row.slug, row.field, row.value, row.source_url, row.checked_at]);
    if (seen.has(key)) throw new Error("Duplicate evidence assertion");
    seen.add(key);
    const fact = bySlug.get(row.slug);
    const caveats = ["Edition and source evidence require human review"];
    let quarantined = !fact || fact[row.field] !== row.value;
    if (quarantined) caveats.push("Evidence and facts CSV disagree");
    const typed = typeRichFact(row.field, row.value);
    caveats.push(...typed.caveats);
    if (typed.value === null) quarantined = true;
    if (row.confidence !== "verified" && row.confidence !== "plausible_needs_review") { quarantined = true; caveats.push("Unknown researcher confidence"); }
    const siblings = evidence.filter((e) => e.slug === row.slug && e.field === row.field);
    if (new Set(siblings.map((e) => e.value)).size > 1) { quarantined = true; caveats.push("Contradictory assertions"); }
    return { slug: row.slug, field: row.field, value: row.value, evidence_quote: row.evidence_quote, source_url: row.source_url, checked_at: row.checked_at, confidence: row.confidence, candidate_value: typed.value, caveats, quarantined };
  });
  for (const row of facts) for (const field of richRaceFields) {
    if (row[field]?.trim() && !evidence.some((e) => e.slug === row.slug && e.field === field)) throw new Error("A populated fact has no supporting evidence");
  }
  return { facts, assertions };
}