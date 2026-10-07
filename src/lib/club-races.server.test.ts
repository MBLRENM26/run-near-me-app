import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadClubRaces } from "./club-races.server";
import { UK_BOUNDS_OR_NULL } from "./events-query";

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
function query(result: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "is", "not", "gte", "or", "order", "range"]) q[method] = vi.fn().mockReturnValue(q);
  q.then = vi.fn((resolve) => Promise.resolve(result).then(resolve));
  return q;
}
const ok = (data: unknown) => ({ data, error: null });
const race = (id: string, entry_url = "https://example.org/race") => ({
  id, slug: `race-${id}`, name: `Race ${id}`, date_from: "2099-10-01", date_to: null,
  sort_date: "2099-10-01", date_raw: "1 October 2099", date_is_estimated: false,
  town: "Street", distances: "5 km", entry_url, organiser_url: null, governance: null,
  organisation_event_links: [{ organisation_id: "org", relationship: "organises" }],
});
function mapped() {
  const forward = query(ok([{ organisation_id: "org" }]));
  const reverse = query(ok([{ club_id: "club" }]));
  db.from.mockReturnValueOnce(forward).mockReturnValueOnce(reverse);
  return { forward, reverse };
}
beforeEach(() => vi.resetAllMocks());

describe("club race discovery", () => {
  it("requires a reviewed club identity and does not fall back to names", async () => {
    db.from.mockReturnValueOnce(query(ok([])));
    await expect(loadClubRaces("club")).resolves.toEqual([]);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith("organisation_club_links");
  });
  it("treats an ambiguous crosswalk as unavailable", async () => {
    db.from.mockReturnValueOnce(query(ok([{ organisation_id: "one" }, { organisation_id: "two" }])));
    await expect(loadClubRaces("club")).resolves.toBeNull();
  });
  it("refuses an organisation mapped to multiple clubs", async () => {
    db.from.mockReturnValueOnce(query(ok([{ organisation_id: "org" }])));
    db.from.mockReturnValueOnce(query(ok([{ club_id: "club" }, { club_id: "another" }])));
    await expect(loadClubRaces("club")).resolves.toBeNull();
  });
  it("requires accepted organising evidence and current canonical UK events; returns public fields only", async () => {
    const { forward, reverse } = mapped();
    const events = query(ok([race("yes"), race("blocked", "https://findarace.com/race"), { ...race("empty"), slug: "" }]));
    db.from.mockReturnValueOnce(events);
    const result = await loadClubRaces("club");
    expect(result?.map((r) => r.id)).toEqual(["yes"]);
    expect(result?.[0]).not.toHaveProperty("organisation_event_links");
    expect(result?.[0]).not.toHaveProperty("entry_url");
    expect(forward.eq).toHaveBeenCalledWith("review_status", "accepted");
    expect(forward.eq).toHaveBeenCalledWith("organisations.status", "approved");
    expect(reverse.eq).toHaveBeenCalledWith("organisation_id", "org");
    for (const pair of [["organiser_club_id", "club"], ["status", "ACTIVE"], ["organisation_event_links.organisation_id", "org"], ["organisation_event_links.relationship", "organises"], ["organisation_event_links.review_status", "accepted"], ["organisation_event_links.confidence", "verified"]]) expect(events.eq).toHaveBeenCalledWith(...pair);
    expect(events.is).toHaveBeenCalledWith("duplicate_of", null);
    expect(events.gte).toHaveBeenCalledWith("sort_date", new Date().toISOString().slice(0, 10));
    expect(events.or).toHaveBeenCalledWith(UK_BOUNDS_OR_NULL);
  });
  it("reads beyond a full page with stable ordering", async () => {
    mapped();
    const first = query(ok(Array.from({ length: 100 }, (_, i) => race(String(i)))));
    const last = query(ok([race("last")]));
    db.from.mockReturnValueOnce(first).mockReturnValueOnce(last);
    const result = await loadClubRaces("club");
    expect(result).toHaveLength(101);
    expect(last.range).toHaveBeenCalledWith(100, 199);
    expect(first.order.mock.calls).toEqual([["sort_date", { ascending: true }], ["id", { ascending: true }]]);
  });
  it("does not present a partial list as success when a later page fails", async () => {
    mapped();
    db.from.mockReturnValueOnce(query(ok(Array.from({ length: 100 }, (_, i) => race(String(i))))));
    db.from.mockReturnValueOnce(query({ data: null, error: { message: "private diagnostic" } }));
    await expect(loadClubRaces("club")).resolves.toBeNull();
  });
  it("contains a thrown connection/client error", async () => {
    db.from.mockImplementation(() => { throw new Error("connection unavailable"); });
    await expect(loadClubRaces("club")).resolves.toBeNull();
  });
});
