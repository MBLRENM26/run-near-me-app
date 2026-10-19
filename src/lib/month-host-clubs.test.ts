import { describe, expect, it } from "vitest";
import { resolveMonthHostClubs, summarizeMonthHostClubs } from "./month-host-clubs";

const events = [{ id: "race", organiser_club_id: "club" }];
const link = { event_id: "race", organisation_id: "org", relationship: "organises", review_status: "accepted", confidence: "verified" };
const mapping = { club_id: "club", organisation_id: "org", review_status: "accepted", approved: true };
const clubs = [{ id: "club", slug: "local-runners", name: "Local Runners", status: "ACTIVE" }];

describe("verified month host clubs", () => {
  it("includes accepted verified organising relationships only", () => {
    expect(resolveMonthHostClubs(events, [link], [mapping], clubs)[0]?.eventIds).toEqual(["race"]);
    for (const review_status of ["proposed", "rejected"]) expect(resolveMonthHostClubs(events, [{ ...link, review_status }], [mapping], clubs)).toEqual([]);
    expect(resolveMonthHostClubs(events, [{ ...link, confidence: "plausible_needs_review" }], [mapping], clubs)).toEqual([]);
    expect(resolveMonthHostClubs(events, [{ ...link, relationship: "source_suggests" }], [mapping], clubs)).toEqual([]);
  });
  it("excludes ambiguous identities in either direction", () => {
    expect(resolveMonthHostClubs(events, [link], [mapping, { ...mapping, organisation_id: "other" }], clubs)).toEqual([]);
    expect(resolveMonthHostClubs(events, [link], [mapping, { ...mapping, club_id: "other" }], clubs)).toEqual([]);
  });
  it("requires approved identity and active club", () => {
    expect(resolveMonthHostClubs(events, [link], [{ ...mapping, approved: false }], clubs)).toEqual([]);
    expect(resolveMonthHostClubs(events, [link], [{ ...mapping, review_status: "proposed" }], clubs)).toEqual([]);
    expect(resolveMonthHostClubs(events, [link], [mapping], [{ ...clubs[0], status: "HIDDEN" }])).toEqual([]);
  });
  it("excludes a mismatched projected club", () => {
    expect(resolveMonthHostClubs([{ id: "race", organiser_club_id: "other" }], [link], [mapping], clubs)).toEqual([]);
  });
  it("counts distinct visible races only and omits filtered-out clubs", () => {
    const hosts = resolveMonthHostClubs([...events, ...events], [link, link], [mapping], clubs);
    const visible = { id: "race", sort_date: "2026-11-01", region: "East" };
    expect(summarizeMonthHostClubs("2026-11", [visible, visible], hosts)[0]?.count).toBe(1);
    expect(summarizeMonthHostClubs("2026-11", [], hosts)).toEqual([]);
    expect(summarizeMonthHostClubs("2026-11", [{ ...visible, id: "other" }], hosts)).toEqual([]);
  });
});