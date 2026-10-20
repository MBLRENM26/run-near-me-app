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
});import { compareWithEarlierBatches } from "./rich-race-research";
describe("second research pass", () => {
  const base = { slug: "r", field: "surface", value: "road", caveats: [] as string[], quarantined: false };
  it("flags disagreement with earlier batch without changing it", () => {
    const earlier = [{ slug: "r", field: "surface", raw_value: "trail" }];
    expect(compareWithEarlierBatches([base], earlier)[0].quarantined).toBe(true);
    expect(earlier[0].raw_value).toBe("trail");
  });
  it("marks repeats rather than quarantining", () => {
    const out = compareWithEarlierBatches([base], [{ slug: "r", field: "surface", raw_value: "road" }])[0];
    expect(out.quarantined).toBe(false);
    expect(out.caveats).toContain("Repeats an earlier research batch");
  });
  it("accepts per-distance parts of a joined fact", () => {
    const f = "slug,start_time\nr,Marathon: 09:00; Half: 10:00\n";
    const e = "slug,field,value,evidence_quote,source_url,checked_at,confidence\nr,start_time,Marathon: 09:00,a,https://x.example/,2026-10-01T00:00:00Z,verified\nr,start_time,Half: 10:00,b,https://x.example/,2026-10-01T00:00:00Z,verified\n";
    expect(validateRichResearch(f, e).assertions.every((a) => !a.quarantined)).toBe(true);
  });
  it("keeps one row when the same fact has two quotes", () => {
    const f = "slug,surface\nr,road\n";
    const e = "slug,field,value,evidence_quote,source_url,checked_at,confidence\nr,surface,road,a,https://x.example/,2026-10-01T00:00:00Z,verified\nr,surface,road,b,https://x.example/,2026-10-01T00:00:00Z,verified\n";
    expect(validateRichResearch(f, e).assertions).toHaveLength(1);
  });
});
