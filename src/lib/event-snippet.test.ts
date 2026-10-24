import { describe, it, expect } from "vitest";
import { buildUpcomingDescription, cleanStartTime, enrichTitle, factHighlights } from "./event-snippet";

const base = { name: "Great Bentley Half", distance: "Half Marathon", loc: "Great Bentley, Essex", when: " on Sunday 7 February 2027" };

describe("event snippet", () => {
  it("makes no fact claims when no facts are held", () => {
    const d = buildUpcomingDescription({ ...base, facts: [] });
    expect(d).not.toMatch(/start|chip|buggies|climb/);
    expect(enrichTitle("Great Bentley Half 2027", [])).toBe("Great Bentley Half 2027");
  });
  it("uses checked facts and stays within 160 chars", () => {
    const d = buildUpcomingDescription({ ...base, facts: [{ field: "start_time", value: "09:30" }, { field: "chip_timed", value: "yes" }] });
    expect(d).toContain("09:30 start, chip timed");
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("rejects prose start times", () => {
    expect(cleanStartTime([{ field: "start_time", value: "From 19:00, heats every 5 minutes" }])).toBeNull();
    expect(cleanStartTime([{ field: "start_time", value: "9.30am" }])).toBe("09:30");
  });
  it("keeps titles at 60 chars or under", () => {
    const long = "A".repeat(55);
    expect(enrichTitle(long, [{ field: "start_time", value: "10:00" }])).toBe(long);
    expect(factHighlights([{ field: "chip_timed", value: "no" }])).toEqual([]);
  });
});
