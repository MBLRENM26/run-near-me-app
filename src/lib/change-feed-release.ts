// Collection and review remain available. Applying reports needs atomic
// compare-and-apply, occurrence date consistency and evidence validation first.
export const CHANGE_FEED_ACCEPTANCE_ENABLED = false;

export function requireChangeFeedAcceptance(decision: string): void {
  if (decision === "accepted" && !CHANGE_FEED_ACCEPTANCE_ENABLED) {
    throw new Error(
      "Applying change reports is temporarily unavailable. Keep this report pending for review.",
    );
  }
}
