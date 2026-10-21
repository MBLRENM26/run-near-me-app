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
  it("accepts quoted organiser facts even when the researcher was unsure", () => expect(triageFact({ ...base, researcher_confidence: "plausible_needs_review" }).kind).toBe("auto"));
  it("sends provisional values to Mike", () => expect(triageFact({ ...base, raw_value: "Race 1: 19:00; Race 2: 19:05 (provisional)" }).kind).toBe("needs_you"));
  it("sends aggregator-sourced facts to Mike", () => expect(triageFact({ ...base, source_url: "https://www.runabc.co.uk/race/1" }).kind).toBe("needs_you"));
  it("sends entry-platform-sourced facts to Mike", () => expect(triageFact({ ...base, source_url: "https://www.sientries.co.uk/event.php?x=1" }).kind).toBe("needs_you"));
  it("sends facts for an estimated race date to Mike", () => expect(triageFact({ ...base, occurrence_snapshot: { date_from: "2026-11-08", date_is_estimated: true } }).kind).toBe("needs_you"));
  it("sends facts with no quote to Mike", () => expect(triageFact({ ...base, evidence_quote: " " }).kind).toBe("needs_you"));
  it("never auto-accepts entry status", () => expect(triageFact({ ...base, field: "entries_status" }).kind).toBe("parked"));
  it("never auto-accepts course maps", () => expect(triageFact({ ...base, field: "course_map_url" }).kind).toBe("parked"));
});

import { resolveGroup, type GroupFact } from "./research-auto-review";
const g = (id: string, value: string, batch: string, extra: Partial<GroupFact> = {}): GroupFact => ({ ...base, id, raw_value: value, batch_created_at: batch, reviewed: false, ...extra });

describe("resolveGroup (rule v2)", () => {
  it("newer pass wins over an older different value", () => {
    const r = resolveGroup([g("old", "09:00", "2026-10-19"), g("new", "09:30", "2026-10-20", { caveats: ["Differs from an earlier research batch"] })]);
    expect(r).toEqual({ accept: ["new"], supersede: ["old"] });
  });
  it("a newer value for the wrong year does not win", () => {
    const r = resolveGroup([g("old", "09:00", "2026-10-19"), g("new", "09:30", "2026-10-20", { caveats: ["Slug year differs from stored edition"] })]);
    expect(r.accept).toEqual([]);
  });
  it("accepts a value confirmed twice despite a second-quote flag", () => {
    const r = resolveGroup([g("a", "Flat", "2026-10-19", { caveats: ["Source page also gave a second supporting quote (not stored)"] }), g("b", "flat", "2026-10-20")]);
    expect(r.accept.sort()).toEqual(["a", "b"]);
  });
  it("a clash within one pass still comes to Mike", () => {
    const r = resolveGroup([g("a", "09:00", "2026-10-20", { match_state: "quarantined" }), g("b", "10:00", "2026-10-20", { match_state: "quarantined" })]);
    expect(r).toEqual({ accept: [], supersede: [] });
  });
  it("never overrides a human decision", () => {
    const r = resolveGroup([g("old", "09:00", "2026-10-19", { reviewed: true }), g("new", "09:30", "2026-10-20", { reviewed: true })]);
    expect(r).toEqual({ accept: [], supersede: [] });
  });
  it("never auto-accepts entry status or course maps", () => {
    for (const field of ["entries_status", "course_map_url"]) expect(resolveGroup([g("a", "x", "1", { field }), g("b", "x", "2", { field })]).accept).toEqual([]);
  });
});
