import { describe, it, expect } from "vitest";
import { monthBrowseLinks } from "./event-internal-links";
import { isIndexableMonth } from "./month-summary";

const e = { date_from: "2027-03-14", sort_date: "2027-03-14", date_is_estimated: false };

describe("monthBrowseLinks", () => {
  it("no link when the month has under 3 races", () => {
    expect(monthBrowseLinks(e, null, { isPast: false }, { month: 2, distance: null }, isIndexableMonth)).toEqual([]);
  });
  it("no links for past races", () => {
    expect(monthBrowseLinks(e, "10k", { isPast: true }, { month: 40, distance: 9 }, isIndexableMonth)).toEqual([]);
  });
  it("distance link only for distances with a month page", () => {
    const trail = monthBrowseLinks(e, "trail", { isPast: false }, { month: 40, distance: 9 }, isIndexableMonth);
    expect(trail.map((l) => l.kind)).toEqual(["month"]);
    const half = monthBrowseLinks(e, "half-marathon", { isPast: false }, { month: 40, distance: 9 }, isIndexableMonth);
    expect(half.map((l) => [l.kind, l.count])).toEqual([["month", 40], ["distance", 9]]);
    expect(half[1].label).toBe("Half marathons in March 2027");
  });
});
