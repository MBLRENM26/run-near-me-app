import { describe, expect, it } from "vitest";
import { typeRichFact, validateRichResearch } from "./rich-race-research";
const facts = "slug,dogs_allowed\nrace-2026,no\n";
const evidence = "slug,field,value,evidence_quote,source_url,checked_at,confidence\nrace-2026,dogs_allowed,no,No dogs,https://club.example/race,2026-10-01T00:00:00Z,verified\n";
describe("private typed race research", () => {
  it("keeps unknown distinct from false", () => {
    expect(typeRichFact("dogs_allowed", "").value).toBeNull();
    expect(typeRichFact("dogs_allowed", "no").value).toBe(false);
    expect(typeRichFact("dogs_allowed", "yes").value).toBe(true);
  });
  it("retains pending licence uncertainty", () => {
    expect(typeRichFact("ugr_licence", "yes; 28881 pending approval").caveats).toContain("Pending or unknown licence");
    expect(typeRichFact("ugr_licence", "yes; UKA licence TBC").caveats).toContain("Pending or unknown licence");
  });
  it("quarantines mismatched slugs and CSV values", () => {
    expect(() => validateRichResearch(facts, evidence.replace("race-2026,dogs_allowed", "other-2026,dogs_allowed"))).toThrow("no supporting evidence");
    expect(validateRichResearch(facts, evidence.replace("dogs_allowed,no,", "dogs_allowed,yes,")).assertions[0].quarantined).toBe(true);
  });
  it("retains contradictions and flags them rather than overwriting", () => {
    const other = "race-2026,dogs_allowed,yes,Dogs allowed,https://club.example/other,2026-10-02T00:00:00Z,verified\n";
    expect(validateRichResearch(facts, evidence + other).assertions.every((r) => r.quarantined)).toBe(true);
  });
  it("rejects duplicate assertions and unbacked facts", () => {
    expect(() => validateRichResearch(facts, evidence + evidence.split("\n")[1] + "\n")).toThrow("Duplicate evidence assertion");
    expect(() => validateRichResearch(facts, evidence.split("\n")[0] + "\n")).toThrow("no supporting evidence");
  });
  it("keeps qualified numerical facts as wording, never guesses numbers", () => {
    expect(typeRichFact("total_climb_m", "<100").value).toBe("<100");
    expect(typeRichFact("min_age", "17 (half); 15 (10k)").value).toBe("17 (half); 15 (10k)");
  });
});