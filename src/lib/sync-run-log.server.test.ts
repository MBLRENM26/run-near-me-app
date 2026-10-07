import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  updates: [] as Record<string, unknown>[],
  notify: vi.fn(),
  saveError: false,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "run" }, error: null }) }),
      }),
      update: (patch: Record<string, unknown>) => {
        mocks.updates.push(patch);
        return {
          eq: async () => ({ error: mocks.saveError ? { message: "write unavailable" } : null }),
        };
      },
    }),
  },
}));
vi.mock("@/lib/notify-sync.server", () => ({ sendSyncSummaryNotification: mocks.notify }));
import { startSyncRun } from "./sync-run-log.server";
const good = {
  checked_at: "2026-10-07T10:00:00Z",
  checked_fields: 8,
  checked_events: 3,
  violation_count: 0,
  violations: [],
  conflict_attempts: 0,
};
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.notify.mockReset();
  mocks.updates.length = 0;
  mocks.saveError = false;
});
describe("durable import assurance", () => {
  it("persists before and after once even when an outer catch finishes again", async () => {
    mocks.rpc.mockResolvedValue({ data: good, error: null });
    const run = await startSyncRun("england-athletics");
    await run.finish({ status: "success", written: 20 });
    await run.finish({ status: "error", error_message: "outer catch" });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.updates.at(-1)).toMatchObject({
      status: "success",
      written: 20,
      review_integrity: { status: "passed", before: good, after: good },
    });
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
  it("refuses to begin a monitored import without a usable baseline", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "RPC down" } });
    await expect(startSyncRun("scottish-athletics")).rejects.toThrow(
      "Pre-import integrity check unavailable",
    );
    expect(mocks.updates.at(-1)).toMatchObject({
      status: "error",
      review_integrity: { status: "unavailable" },
    });
  });
  it("persists post-check failures and throws even when notifications are disabled", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: good, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "RPC down" } });
    const run = await startSyncRun("england-athletics", { notify: false });
    await expect(run.finish({ status: "success", written: 2 })).rejects.toThrow(
      "Post-import integrity check unavailable",
    );
    expect(mocks.updates.at(-1)).toMatchObject({
      status: "error",
      written: 2,
      review_integrity: { status: "unavailable" },
    });
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("does not silently swallow a failed receipt write", async () => {
    mocks.rpc.mockResolvedValue({ data: good, error: null });
    const run = await startSyncRun("england-athletics");
    mocks.saveError = true;
    await expect(run.finish({ status: "success" })).rejects.toThrow("write unavailable");
  });
  it("does not add event checks to the unrelated clubs import", async () => {
    const run = await startSyncRun("scottish-athletics-clubs", { notify: false });
    await run.finish({ status: "success" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)).not.toHaveProperty("review_integrity");
  });
});
