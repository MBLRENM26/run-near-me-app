import { describe, expect, it } from "vitest";
import {
  buildMonthSummary,
  isIndexableMonth,
  shiftMonth,
  weekendSaturday,
} from "./month-summary";

const ev = (id: string, sort_date: string, extra: Record<string, unknown> = {}) => ({
  id,
  sort_date,
  region: "South East",
  terrain_tags: ["road"],
  ...extra,
});

describe("month summary", () => {
  it("separates confirmed and estimated dates", () => {
    const s = buildMonthSummary("2027-03", [
      ev("a", "2027-03-13"),
      ev("b", "2027-03-14"),
      ev("c", "2027-03-01", { date_is_estimated: true }),
    ]);
    expect(s.total).toBe(3);
    expect(s.confirmed).toBe(2);
    expect(s.estimated).toBe(1);
    // estimated dates are not counted against a specific day
    expect(s.byDay).toEqual([
      { date: "2027-03-13", count: 1 },
      { date: "2027-03-14", count: 1 },
    ]);
  });

  it("counts races per weekend day (13–14 March 2027)", () => {
    const s = buildMonthSummary("2027-03", [
      ev("a", "2027-03-13"),
      ev("b", "2027-03-13"),
      ev("c", "2027-03-14"),
    ]);
    const w = s.weekends.find((x) => x.saturday === "2027-03-13");
    expect(w).toMatchObject({ saturdayCount: 2, sundayCount: 1, sunday: "2027-03-14" });
  });

  it("anchors a Sunday on the previous Saturday", () => {
    expect(weekendSaturday("2027-03-14")).toBe("2027-03-13");
    expect(weekendSaturday("2027-03-10")).toBeNull();
  });

  it("counts region, terrain and course maps", () => {
    const s = buildMonthSummary(
      "2027-03",
      [ev("a", "2027-03-13"), ev("b", "2027-03-14", { region: "Scotland", terrain_tags: ["trail"] })],
      new Set(["b"]),
    );
    expect(s.byRegion).toEqual([
      { label: "Scotland", count: 1 },
      { label: "South East", count: 1 },
    ]);
    expect(s.byTerrain.map((t) => t.label).sort()).toEqual(["Road", "Trail"]);
    expect(s.courseMapCount).toBe(1);
  });

  it("keeps months with fewer than 3 races out of search", () => {
    expect(isIndexableMonth(2)).toBe(false);
    expect(isIndexableMonth(3)).toBe(true);
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
