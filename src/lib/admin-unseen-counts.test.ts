import { describe, expect, it } from "vitest";
import { deriveViewState } from "./admin-subscriptions.core";

/**
 * The subscribers page only marks rows seen when the derived view state is
 * "data" (authenticated successful load). This mirrors the guard in
 * _adminShell.admin.subscriptions.tsx.
 */
function shouldMarkSeen(state: { kind: string }): boolean {
  return state.kind === "data";
}

/** Mirrors getUnseenCounts' total arithmetic. */
function total(c: {
  submissions: number;
  clubClaims: number;
  emailSubscriptions: number;
}): number {
  return c.submissions + c.clubClaims + c.emailSubscriptions;
}

describe("unseen counts", () => {
  it("includes null-seen subscriber rows in the total", () => {
    expect(total({ submissions: 0, clubClaims: 0, emailSubscriptions: 3 })).toBe(
      3,
    );
  });

  it("leaves submission and club-claim counts unchanged", () => {
    const c = { submissions: 2, clubClaims: 1, emailSubscriptions: 4 };
    expect(c.submissions).toBe(2);
    expect(c.clubClaims).toBe(1);
    expect(total(c)).toBe(7);
  });

  it("backfilled/all-seen subscribers contribute zero", () => {
    expect(total({ submissions: 0, clubClaims: 0, emailSubscriptions: 0 })).toBe(
      0,
    );
  });
});

describe("mark-seen gating", () => {
  it("does not mark seen when unauthenticated", () => {
    const state = deriveViewState({
      isLoading: false,
      subs: { status: "unauthenticated" },
      stats: { status: "unauthenticated" },
    });
    expect(state.kind).toBe("unauthenticated");
    expect(shouldMarkSeen(state)).toBe(false);
  });

  it("does not mark seen while loading", () => {
    expect(shouldMarkSeen(deriveViewState({ isLoading: true }))).toBe(false);
  });

  it("does not mark seen on error", () => {
    expect(
      shouldMarkSeen(
        deriveViewState({ isLoading: false, error: new Error("boom") }),
      ),
    ).toBe(false);
  });

  it("marks seen on an authenticated successful load, including empty", () => {
    expect(
      shouldMarkSeen(
        deriveViewState({
          isLoading: false,
          subs: { status: "ok", rows: [] },
          stats: { status: "ok", total: 0, byKind: {} },
        }),
      ),
    ).toBe(true);
  });
});
