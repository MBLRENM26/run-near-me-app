import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadRegionEvents } from "./region-page.server";

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));

function query() {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  db.from.mockReturnValue(q);
  return q;
}

const race = (id: string) => ({
  id,
  slug: `race-${id}`,
  name: `Race ${id}`,
  date_raw: null,
  sort_date: "2099-10-01",
  town: "London",
  county: null,
  distances: "10 km",
  entry_fee: null,
  entry_url: "https://example.org/race",
  organiser_url: null,
  is_featured: false,
  governance: null,
});

beforeEach(() => vi.clearAllMocks());

describe("regional server loader", () => {
  it("loads beyond a full page with stable ordering and retains the discovery gate", async () => {
    const q = query();
    q.range.mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, (_, i) => race(String(i))),
      error: null,
    });
    q.range.mockResolvedValueOnce({
      data: [race("last"), { ...race("untrusted"), entry_url: "https://findarace.com/race" }],
      error: null,
    });
    const result = await loadRegionEvents("london");
    expect(result).toHaveLength(1001);
    expect(result.some((r) => r.id === "last")).toBe(true);
    expect(result.some((r) => r.id === "untrusted")).toBe(false);
    expect(result[0].distance_type).toBe("10 km");
    expect(db.from).toHaveBeenCalledWith("events_public_v1");
    expect(q.eq).toHaveBeenCalledWith("region", "London");
    expect(q.order.mock.calls.slice(0, 2)).toEqual([
      ["sort_date", { ascending: true, nullsFirst: false }],
      ["id", { ascending: true }],
    ]);
    expect(q.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("fails visibly instead of rendering a successful empty/partial directory", async () => {
    const q = query();
    q.range.mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, (_, i) => race(String(i))),
      error: null,
    });
    q.range.mockResolvedValueOnce({
      data: null,
      error: { message: "private database diagnostic" },
    });
    await expect(loadRegionEvents("london")).rejects.toThrow("Could not load regional events");
  });

  it("rejects unsupported region input before reading data", async () => {
    await expect(async () => loadRegionEvents("not-a-region")).rejects.toThrow("Unknown region");
    expect(db.from).not.toHaveBeenCalled();
  });
});
