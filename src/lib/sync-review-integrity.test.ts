import { describe, expect, it } from "vitest";
import {
  compareReviewSnapshots,
  reviewSnapshotSchema,
  type ReviewSnapshot,
} from "./sync-review-integrity";

const good: ReviewSnapshot = {
  checked_at: "2026-10-07T09:00:00Z",
  checked_fields: 12,
  checked_events: 4,
  violation_count: 0,
  violations: [],
  conflict_attempts: 3,
};
describe("post-import reviewed-data assurance", () => {
  it("passes preserved corrections; separately flags blocked source changes", () => {
    expect(compareReviewSnapshots(good, good).status).toBe("passed");
    const held = compareReviewSnapshots(good, { ...good, conflict_attempts: 5 });
    expect(held.status).toBe("review_required");
    expect(held.conflict_attempts_added).toBe(2);
  });
  it("never turns a failed or missing audit into success", () => {
    expect(compareReviewSnapshots(good, null, "RPC unavailable").status).toBe("unavailable");
    expect(compareReviewSnapshots(null, good).status).toBe("unavailable");
    expect(reviewSnapshotSchema.safeParse({}).success).toBe(false);
    expect(
      compareReviewSnapshots(good, {
        ...good,
        violation_count: 1,
        violations: [{ event_id: "race", field: "lat" }],
      }).status,
    ).toBe("failed");
  });
  it("keeps pre-existing problems visible even if an authorised review resolved them during the run", () => {
    expect(compareReviewSnapshots({ ...good, violation_count: 1 }, good).status).toBe(
      "review_required",
    );
  });
});
