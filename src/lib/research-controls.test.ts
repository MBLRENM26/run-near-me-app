import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
const id = "11111111-1111-4111-8111-111111111111";
async function get(query = "", purpose = "sources") {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", "test-secret").update(`${ts}.${purpose}`).digest("hex");
  const request = new Request(`https://example.org/api/public/ingest/research${query}`, {
    headers: { "x-renm-timestamp": ts, "x-renm-signature": sig },
  });
  const { Route } = await import("@/routes/api/public/ingest/research");
  const route = Route as unknown as {
    options: { server: { handlers: { GET: (ctx: { request: Request }) => Promise<Response> } } };
  };
  return route.options.server.handlers.GET({ request });
}
beforeEach(() => {
  vi.stubEnv("RESEARCH_FEED_SECRET", "test-secret");
  db.rpc
    .mockReset()
    .mockResolvedValue({
      data: {
        sources: [{ id }],
        pending_review: 45,
        review_workload: {
          version: 1,
          raw_outstanding: 45,
          verified_completed_support: 18,
          actionable_review: 27,
        },
      },
      error: null,
    });
});
afterEach(() => vi.unstubAllEnvs());
it("keeps the raw counter for old workers", async () => {
  const response = await get();
  expect(await response.json()).toEqual({ version: 1, sources: [{ id }], pending_review: 45 });
  expect(db.rpc).toHaveBeenCalledWith("research_monitor_controls", { _source_ids: null });
});
it("returns both counters and exact signed source selection for opted-in workers", async () => {
  const response = await get(`?version=2&sources=${id}`, `sources.v2.${id}`);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    version: 2,
    sources_complete: true,
    pending_review: 45,
    requested_source_ids: [id],
    review_workload: { actionable_review: 27 },
  });
  expect(db.rpc).toHaveBeenCalledWith("research_monitor_controls", { _source_ids: [id] });
});
it("refuses replaying an old signature for scoped controls", async () => {
  expect((await get(`?version=2&sources=${id}`)).status).toBe(401);
  expect(db.rpc).not.toHaveBeenCalled();
});
it("rejects malformed and duplicate selections before database access", async () => {
  for (const query of [
    "?version=2",
    "?version=3&sources=" + id,
    `?version=2&sources=${id},${id}`,
    "?version=2&sources=invalid",
  ])
    expect((await get(query)).status).toBe(400);
  expect(db.rpc).not.toHaveBeenCalled();
});
it("fails closed on missing, extra, duplicate or unavailable source controls", async () => {
  for (const sources of [[], [{ id: "wrong" }], [{ id }, { id }]]) {
    db.rpc.mockResolvedValue({ data: { sources }, error: null });
    expect((await get(`?version=2&sources=${id}`, `sources.v2.${id}`)).status).toBe(503);
  }
  db.rpc.mockResolvedValue({ data: null, error: { message: "not installed" } });
  expect((await get()).status).toBe(503);
});
