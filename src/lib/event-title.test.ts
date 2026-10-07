import { describe, expect, it } from "vitest";
import { eventNameWithYear } from "./event-title";

describe("event name with occurrence year", () => {
  it("keeps reviewed current-year names without duplicating the year", () => {
    expect(eventNameWithYear("Brodie Castle 10K 2026", "2026")).toBe("Brodie Castle 10K 2026");
    expect(eventNameWithYear("2026 National Relays", "2026")).toBe("2026 National Relays");
    expect(eventNameWithYear("Race (2026)", "2026")).toBe("Race (2026)");
  });
  it("adds known occurrence years without guessing or erasing names", () => {
    expect(eventNameWithYear("Brodie Castle 10K", "2026")).toBe("Brodie Castle 10K 2026");
    expect(eventNameWithYear("Race 12026", "2026")).toBe("Race 12026 2026");
    expect(eventNameWithYear("Race", "")).toBe("Race");
    expect(eventNameWithYear(null, "2026")).toBe("2026");
  });
});
