import { describe, expect, it } from "vitest";
import { isFlatCourseValue, MIN_INDEXABLE_FEATURE_EVENTS } from "./flat-course";

describe("isFlatCourseValue", () => {
  it("accepts explicit flat wording", () => {
    expect(isFlatCourseValue("Flat")).toBe(true);
    expect(isFlatCourseValue("fast, flat; no tight corners")).toBe(true);
    expect(isFlatCourseValue("largely flat")).toBe(true);
  });
  it("rejects courses that mention hills or climbs", () => {
    expect(isFlatCourseValue("not flat; sharp climbs")).toBe(false);
    expect(isFlatCourseValue("hill ascent twice, with a flat section")).toBe(false);
    expect(isFlatCourseValue("relatively flat with a couple of undulations")).toBe(false);
    expect(isFlatCourseValue("undulating")).toBe(false);
    expect(isFlatCourseValue("")).toBe(false);
  });
  it("needs at least 8 races to be indexable", () => {
    expect(MIN_INDEXABLE_FEATURE_EVENTS).toBe(8);
  });
});
