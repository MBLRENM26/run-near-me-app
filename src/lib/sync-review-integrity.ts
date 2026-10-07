import { z } from "zod";

export const reviewSnapshotSchema = z.object({
  checked_at: z.string(),
  checked_fields: z.number().int().nonnegative(),
  checked_events: z.number().int().nonnegative(),
  violation_count: z.number().int().nonnegative(),
  violations: z.array(
    z.object({
      event_id: z.string(),
      field: z.string(),
      expected: z.string().nullable().optional(),
      actual: z.string().nullable().optional(),
    }),
  ),
  conflict_attempts: z.number().int().nonnegative(),
});
export type ReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;
export type SyncReviewIntegrity = {
  status: "checking" | "passed" | "review_required" | "failed" | "unavailable";
  before: ReviewSnapshot | null;
  after: ReviewSnapshot | null;
  conflict_attempts_added: number | null;
  error?: string;
};

export function compareReviewSnapshots(
  before: ReviewSnapshot | null,
  after: ReviewSnapshot | null,
  error?: string,
): SyncReviewIntegrity {
  const added =
    before && after ? Math.max(0, after.conflict_attempts - before.conflict_attempts) : null;
  return {
    status: after?.violation_count
      ? "failed"
      : !before || !after
        ? "unavailable"
        : before.violation_count || added
          ? "review_required"
          : "passed",
    before,
    after,
    conflict_attempts_added: added,
    ...(error ? { error } : {}),
  };
}
