import { describe, expect, it } from "vitest";
import { eventExtractionSchema, researchEventFields } from "./research-event-facts";
import { canApplyResearch, researchEnvelope } from "./source-research";
import contractFixtures from "../../services/race-monitor/event-facts-contract-fixtures.json";

function extraction(facts: { field: string; value: unknown; quote?: string; locator?: string }[]) {
  return {
    version: 1,
    facts: facts.map((f) => ({ quote: "Race page evidence", locator: "text:heading", ...f })),
    missing_fields: researchEventFields.filter((f) => !facts.some((fact) => fact.field === f)),
    issues: [],
  };
}
describe("database mapped research intake", () => {
  it("accepts actual Python output including weekly, mixed editions and structured facts", () => {
    const results = contractFixtures.map((fixture) => fixture.expected);
    for (const result of results) expect(eventExtractionSchema.parse(result)).toEqual(result);
  });
  it("rejects internal/derived fields, invalid dates, URL credentials, wrong types and half coordinates", () => {
    for (const [field, value] of [
      ["status", "ACTIVE"],
      ["id", "invented"],
      ["description", "page copy"],
      ["organiser_club_id", "guess"],
      ["distance_tags", "10k"],
      ["date_from", "2027-02-30"],
      ["entry_url", "javascript:alert(1)"],
      ["entry_url", "https://a:b@example.org"],
      ["is_recurring", "yes"],
      ["lat", 52],
    ]) {
      expect(
        eventExtractionSchema.safeParse(extraction([{ field: String(field), value }])).success,
      ).toBe(false);
    }
  });
  it("rejects omissions presented as clears, incomplete missing lists and excessive evidence", () => {
    expect(
      eventExtractionSchema.safeParse(extraction([{ field: "name", value: null }])).success,
    ).toBe(false);
    expect(eventExtractionSchema.safeParse({ ...extraction([]), missing_fields: [] }).success).toBe(
      false,
    );
    expect(
      eventExtractionSchema.safeParse(
        extraction(
          Array.from({ length: 20 }, (_, i) => ({
            field: "name",
            value: `Race ${i}`,
            quote: "x".repeat(240),
          })),
        ),
      ).success,
    ).toBe(false);
    expect(
      eventExtractionSchema.safeParse(
        extraction([
          { field: "is_recurring", value: true },
          { field: "date_from", value: "2026-10-03" },
        ]),
      ).success,
    ).toBe(false);
  });
  it("keeps historical notices compatible and facts review-only", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      source_id: "11111111-1111-4111-8111-111111111111",
      run_id: "11111111-1111-4111-8111-111111111111",
      evidence: {
        source_url: "https://club.example/race",
        final_url: "https://club.example/race",
        captured_at: "2026-01-01T00:00:00Z",
        content_sha256: "a".repeat(64),
        extractor: "events-mapped-v1",
        summary: "Mapped facts for review",
      },
      conflicts: [],
    };
    for (const proposal of [
      { kind: "page_change" },
      { kind: "page_change", extraction: extraction([{ field: "name", value: "Local 10K" }]) },
    ]) {
      const result = researchEnvelope.parse({ version: 1, observations: [{ ...base, proposal }] });
      expect(canApplyResearch(result.observations[0])).toBe(false);
    }
  });
});
