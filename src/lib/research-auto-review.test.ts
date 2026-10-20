import { describe, expect, it } from "vitest";
import { triageFact, type ReviewableFact } from "./research-auto-review";

const base: ReviewableFact = {
  field: "start_time", source_url: "https://chopwellwoodsrun.co.uk/info", evidence_quote: "Race starts at 10am",
  researcher_confidence: "verified", match_state: "needs_edition_review",
  caveats: ["Edition and source evidence require human review"],
  occurrence_snapshot: { date_from: "2026-11-08", date_is_estimated: false },
};

describe("triageFact", () => {
  it("auto-accepts a clean verified fact from the organiser's site", () => expect(triageFact(base).kind).toBe("auto"));
  it("sends flagged facts to Mike", () => expect(triageFact({ ...base, match_state: "quarantined" }).kind).toBe("needs_you"));
  it("sends facts that differ from an earlier pass to Mike", () => expect(triageFact({ ...base, caveats: ["Differs from an earlier research batch"] }).kind).toBe("needs_you"));
  it("sends unsure facts to Mike", () => expect(triageFact({ ...base, researcher_confidence: "plausible_needs_review" }).kind).toBe("needs_you"));
  it("sends aggregator-sourced facts to Mike", () => expect(triageFact({ ...base, source_url: "https://www.runabc.co.uk/race/1" }).kind).toBe("needs_you"));
  it("sends entry-platform-sourced facts to Mike", () => expect(triageFact({ ...base, source_url: "https://www.sientries.co.uk/event.php?x=1" }).kind).toBe("needs_you"));
  it("sends facts for an estimated race date to Mike", () => expect(triageFact({ ...base, occurrence_snapshot: { date_from: "2026-11-08", date_is_estimated: true } }).kind).toBe("needs_you"));
  it("sends facts with no quote to Mike", () => expect(triageFact({ ...base, evidence_quote: " " }).kind).toBe("needs_you"));
  it("never auto-accepts entry status", () => expect(triageFact({ ...base, field: "entries_status" }).kind).toBe("parked"));
  it("never auto-accepts course maps", () => expect(triageFact({ ...base, field: "course_map_url" }).kind).toBe("parked"));
});
