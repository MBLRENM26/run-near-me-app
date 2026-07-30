import { describe, expect, it, vi } from "vitest";
import {
  deriveViewState,
  loadSubscriptions,
  loadSubscriptionStats,
} from "./admin-subscriptions.core";

function deps(authed: boolean, rows: unknown[] = []) {
  const getClient = vi.fn(async () => ({
    from: () => {
      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: async () => ({ data: rows, error: null }),
        then: (res: (v: any) => void) => res({ data: rows, error: null }),
      };
      return builder;
    },
  }));
  return {
    deps: { isAuthenticated: async () => authed, getClient },
    getClient,
  };
}

describe("unauthenticated sentinel", () => {
  it("returns sentinel without any database call (list)", async () => {
    const { deps: d, getClient } = deps(false);
    expect(await loadSubscriptions(d)).toEqual({ status: "unauthenticated" });
    expect(getClient).not.toHaveBeenCalled();
  });

  it("returns sentinel without any database call (stats)", async () => {
    const { deps: d, getClient } = deps(false);
    expect(await loadSubscriptionStats(d)).toEqual({
      status: "unauthenticated",
    });
    expect(getClient).not.toHaveBeenCalled();
  });
});

describe("authenticated empty data", () => {
  it("is a valid empty ok state, distinct from unauthenticated", async () => {
    const { deps: d, getClient } = deps(true, []);
    const res = await loadSubscriptions(d);
    expect(res).toEqual({ status: "ok", rows: [] });
    expect(getClient).toHaveBeenCalled();
  });

  it("stats zero total is ok, not unauthenticated", async () => {
    const { deps: d } = deps(true, []);
    expect(await loadSubscriptionStats(d)).toEqual({
      status: "ok",
      total: 0,
      byKind: {},
    });
  });
});

describe("view state cannot represent unauthenticated as zero subscribers", () => {
  it("unauthenticated list -> unauthenticated view", () => {
    expect(
      deriveViewState({
        isLoading: false,
        subs: { status: "unauthenticated" },
        stats: { status: "unauthenticated" },
      }).kind,
    ).toBe("unauthenticated");
  });

  it("unauthenticated stats alone -> unauthenticated view", () => {
    expect(
      deriveViewState({
        isLoading: false,
        subs: { status: "ok", rows: [] },
        stats: { status: "unauthenticated" },
      }).kind,
    ).toBe("unauthenticated");
  });

  it("authenticated empty -> data view with zero rows", () => {
    const state = deriveViewState({
      isLoading: false,
      subs: { status: "ok", rows: [] },
      stats: { status: "ok", total: 0, byKind: {} },
    });
    expect(state).toMatchObject({ kind: "data", total: 0 });
  });
});
