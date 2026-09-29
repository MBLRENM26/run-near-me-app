import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { researchEnvelope, canApplyResearch } from "./source-research";
import { validResearchSignature, boundedResearchBody } from "./source-research-auth.server";
const id = "11111111-1111-4111-8111-111111111111";
const observation = {
  id,
  source_id: id,
  run_id: id,
  evidence: {
    source_url: "https://club.example/race",
    final_url: "https://club.example/race",
    captured_at: "2026-01-01T00:00:00Z",
    content_sha256: "a".repeat(64),
    extractor: "manual-v1",
    summary: "Official club race page identifies this edition.",
  },
  proposal: {
    kind: "event_change" as const,
    event_id: id,
    expected_date: "2027-02-07",
    field: "entry_url" as const,
    expected_value: null,
    proposed_value: "https://entry.example/race",
  },
  conflicts: [],
};
describe("source research contract", () => {
  it("requires the occurrence and expected old value for corrections", () => {
    expect(researchEnvelope.safeParse({ version: 1, observations: [observation] }).success).toBe(
      true,
    );
    const missing = structuredClone(observation);
    delete (missing.proposal as Partial<typeof missing.proposal>).expected_value;
    expect(researchEnvelope.safeParse({ version: 1, observations: [missing] }).success).toBe(false);
    expect(
      researchEnvelope.safeParse({
        version: 1,
        observations: [
          { ...observation, proposal: { ...observation.proposal, expected_date: "2027-02-30" } },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects executable and credential-bearing destinations", () => {
    for (const proposed_value of [
      "javascript:alert(1)",
      "https://user:password@example.org/race",
    ]) {
      expect(
        researchEnvelope.safeParse({
          version: 1,
          observations: [{ ...observation, proposal: { ...observation.proposal, proposed_value } }],
        }).success,
      ).toBe(false);
    }
  });
  it("retains undated recurrence without making it applicable", () => {
    const item = {
      ...observation,
      proposal: {
        kind: "new_occurrence" as const,
        name: "Weekly run",
        date: null,
        location: "Park",
        schedule: "Every Saturday",
        entry_url: null,
      },
    };
    expect(researchEnvelope.safeParse({ version: 1, observations: [item] }).success).toBe(true);
    expect(canApplyResearch(item)).toBe(false);
  });
  it("keeps original change reports review-only without inventing capture evidence", () => {
    const report = {
      ...observation,
      proposal: {
        kind: "legacy_report" as const,
        event_id: id,
        field: "entry_url",
        expected_value: null,
        proposed_value: "https://entry.example/new",
      },
    };
    expect(canApplyResearch(report)).toBe(false);
    expect(researchEnvelope.safeParse({ version: 1, observations: [report] }).success).toBe(false);
  });
  it("blocks mixed-year conflicts and duplicate observation IDs", () => {
    expect(canApplyResearch({ ...observation, conflicts: ["2027 header, 2026 body"] })).toBe(false);
    expect(
      researchEnvelope.safeParse({ version: 1, observations: [observation, observation] }).success,
    ).toBe(false);
  });
});
describe("research request authentication", () => {
  const ts = "1790700000",
    body = '{"version":1}',
    secret = "fixture-only",
    now = Number(ts) * 1000;
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  it("binds the exact body and timestamp", () => {
    expect(validResearchSignature(secret, ts, body, sig, now)).toBe(true);
    expect(validResearchSignature(secret, ts, body + " ", sig, now)).toBe(false);
    expect(validResearchSignature(secret, ts, body, sig, now + 301000)).toBe(false);
    expect(validResearchSignature(secret, "", body, sig, now)).toBe(false);
    expect(validResearchSignature(secret, ts, body, sig + "z", now)).toBe(false);
  });
  it("bounds streamed body bytes before parsing", async () => {
    const req = new Request("https://example.org", { method: "POST", body: "ééé" });
    await expect(boundedResearchBody(req, 5)).rejects.toThrow("body_too_large");
    expect(
      await boundedResearchBody(new Request("https://example.org", { method: "POST", body }), 100),
    ).toBe(body);
  });
});
