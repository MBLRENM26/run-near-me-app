import { beforeEach, expect, it, vi } from "vitest";
import { loadMonthHostClubs } from "./month-host-clubs.server";
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
function query(data: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "in", "is", "eq", "gte", "order", "range"]) q[m] = vi.fn().mockReturnValue(q);
  q.then = vi.fn((resolve) => Promise.resolve({ data, error: null }).then(resolve));
  return q;
}
beforeEach(() => vi.resetAllMocks());
it("only reads supplied month/distance IDs and requires confirmed future canonical occurrences", async () => {
  const events = query([{ id: "ok", organiser_club_id: "club", date_from: "2099-11-01", sort_date: "2099-11-01" }, { id: "stale", organiser_club_id: "club", date_from: "2098-11-01", sort_date: "2099-11-01" }]);
  const links = query(["ok", "stale"].map((event_id) => ({ event_id, organisation_id: "org", relationship: "organises", review_status: "accepted", confidence: "verified" })));
  const mapping = { id: "mapping", club_id: "club", organisation_id: "org", review_status: "accepted", organisations: { status: "approved" } };
  db.from.mockReturnValueOnce(events).mockReturnValueOnce(links).mockReturnValueOnce(query([mapping])).mockReturnValueOnce(query([mapping])).mockReturnValueOnce(query([{ id: "club", slug: "runners", name: "Runners", status: "ACTIVE" }]));
  expect(await loadMonthHostClubs(["ok", "stale"])).toEqual([{ id: "club", slug: "runners", name: "Runners", eventIds: ["ok"] }]);
  expect(events.in).toHaveBeenCalledWith("id", ["ok", "stale"]);
  expect(events.is).toHaveBeenCalledWith("duplicate_of", null);
  expect(events.eq).toHaveBeenCalledWith("date_is_estimated", false);
  expect(events.gte).toHaveBeenCalledWith("sort_date", new Date().toISOString().slice(0, 10));
});