import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importEvents } from "./event-import.server";

const db = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
const row = {
  norm_id: "fixture-race",
  name: "Fixture race",
  country: "England",
  lat: 51.5,
  lng: -0.1,
};
function request(events: unknown[], secret = "test-only") {
  return new Request("https://example.test/api/public/import-events", {
    method: "POST",
    headers: { "x-import-secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("IMPORT_SECRET", "test-only");
  db.from.mockReturnValue(db);
  db.upsert.mockReturnValue(db);
  db.select.mockResolvedValue({ data: [{ id: "fixture", norm_id: row.norm_id }], error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("generic import geography boundary", () => {
  it("keeps authentication ahead of validation and performs no unauthorised writes", async () => {
    expect((await importEvents(request([row], "wrong"))).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("rejects an entire mixed batch before writing any otherwise valid rows", async () => {
    const res = await importEvents(
      request([row, { ...row, norm_id: "bad", lat: 52.83816401, lng: -2.327480844 }]),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      ok: false,
      received: 2,
      written: 0,
      rejected: [{ index: 1, norm_id: "bad", reasons: ["known_fallback_coordinates"] }],
    });
    expect(db.from).not.toHaveBeenCalled();
  });
  it("preserves norm_id upserts, source identity, dates and existing DB review triggers", async () => {
    const race = {
      ...row,
      source: "ea",
      source_url: "https://example.test/source",
      date_from: "2099-10-03",
      county: "West Yorkshire",
      entry_url: "https://example.test/entry",
    };
    const res = await importEvents(request([race]));
    expect(res.status).toBe(200);
    expect(db.from).toHaveBeenCalledWith("events");
    expect(db.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          ...race,
          region: "Yorkshire",
          sort_date: "2099-10-03",
          is_upcoming: true,
        }),
      ],
      { onConflict: "norm_id" },
    );
  });
  it("accepts undated recurring events without manufacturing a date or coordinates", async () => {
    await importEvents(
      request([
        {
          norm_id: "parkrun-fixture",
          name: "Weekly run",
          is_recurring: true,
          country: "United Kingdom",
          region: "United Kingdom",
        },
      ]),
    );
    const written = db.upsert.mock.calls[0][0][0];
    expect(written).toMatchObject({
      is_recurring: true,
      sort_date: null,
      region: "United Kingdom",
    });
    expect(written.lat).toBeUndefined();
    expect(written.date_from).toBeUndefined();
  });
  it("retains valid overseas records with no invented UK region", async () => {
    const race = { ...row, country: " Australia ", lat: -37.8186, lng: 144.9756 };
    expect((await importEvents(request([race]))).status).toBe(200);
    expect(db.upsert.mock.calls[0][0][0]).toMatchObject({ country: "Australia", region: null });
  });
  it("preserves validation errors and database failures as failures", async () => {
    expect((await importEvents(request([{ ...row, lat: 999 }]))).status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
    db.select.mockResolvedValue({ data: null, error: { message: "review guard failure" } });
    expect((await importEvents(request([row]))).status).toBeGreaterThanOrEqual(400);
  });
});
