import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLiveStats } from "./stats.server";

const db = vi.hoisted(() => ({ getRpc: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    get rpc() {
      db.getRpc();
      return db.rpc;
    },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-not-a-credential");
});
afterEach(() => vi.unstubAllEnvs());

describe("optional stats server boundary", () => {
  it.each(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])(
    "returns unavailable before accessing the admin client when %s is absent",
    async (name) => {
      vi.stubEnv(name, "");
      await expect(readLiveStats()).resolves.toBeNull();
      expect(db.getRpc).not.toHaveBeenCalled();
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );
  it("contains a synchronous lazy-client construction failure", async () => {
    db.getRpc.mockImplementation(() => {
      throw new Error("Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY");
    });
    await expect(readLiveStats()).resolves.toBeNull();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("contains rejected network requests", async () => {
    db.rpc.mockRejectedValue(new Error("Network failure"));
    await expect(readLiveStats()).resolves.toBeNull();
  });
  it("does not report a database error as zero races", async () => {
    db.rpc.mockResolvedValue({ data: 0, error: { message: "unavailable" } });
    await expect(readLiveStats()).resolves.toBeNull();
  });
  it.each([null, -1, 1.5, "42", Number.NaN])("rejects invalid counts: %s", async (data) => {
    db.rpc.mockResolvedValue({ data, error: null });
    await expect(readLiveStats()).resolves.toBeNull();
  });
  it.each([0, 1234])("preserves a verified count of %s", async (data) => {
    db.rpc.mockResolvedValue({ data, error: null });
    const result = await readLiveStats();
    expect(result?.activeEvents).toBe(data);
    expect(Number.isNaN(Date.parse(result!.updatedAt))).toBe(false);
    expect(db.rpc).toHaveBeenCalledWith("count_active_events");
  });
});
