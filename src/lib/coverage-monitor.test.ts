import { describe, expect, it } from "vitest";
import { calendarDelta, COVERAGE_CALENDARS, extractCalendarLinks, latestAliasFacts, trialActive } from "./coverage-monitor";

describe("approved coverage monitoring boundaries", () => {
  it("expires the four-week trial on 4 December 2026", () => {
    expect(trialActive(new Date("2026-12-03T23:59:59Z"))).toBe(true);
    expect(trialActive(new Date("2026-12-04T00:00:00Z"))).toBe(false);
  });
  it("uses only the four approved calendars", () => {
    expect(COVERAGE_CALENDARS.map((c) => c.label)).toEqual(["Run Happy Run Healthy", "Nice Work", "Sporting Events UK", "RunThrough"]);
    expect(() => extractCalendarLinks("", "https://example.org")).toThrow("not approved");
  });
  it("does not follow external, insecure, or non-event links", () => {
    const links = extractCalendarLinks('<a href="/e/race-1?tracking=x">Kent &amp; Medway</a><a href="https://attacker.org/e/1">Bad</a><a href="http://www.nice-work.org.uk/e/2">Bad</a><a href="/about">About</a>', COVERAGE_CALENDARS[1].url);
    expect(links).toEqual([{ url: "https://www.nice-work.org.uk/e/race-1", title: "Kent & Medway" }]);
  });
  it("reports new leads without treating disappearance as cancellation", () => {
    const links = [{ url: "https://www.nice-work.org.uk/e/new", title: "New race" }, { url: "https://www.nice-work.org.uk/e/known", title: "Known race" }];
    expect(calendarDelta(links, ["https://nice-work.org.uk/e/known/"], ["https://www.nice-work.org.uk/e/old"])).toEqual([{ ...links[0], newlySeen: true }]);
  });
  it("selects newer accepted duplicate evidence without losing unique fields", () => {
    const rows = [
      { id: "1", field: "parking", raw_value: "Old", checked_at: "2026-10-19" },
      { id: "2", field: "parking", raw_value: "New", checked_at: "2026-10-21" },
      { id: "3", field: "surface", raw_value: "Trail", checked_at: "2026-10-19" },
    ];
    expect(latestAliasFacts(rows).map((r) => r.raw_value)).toEqual(["New", "Trail"]);
  });
});