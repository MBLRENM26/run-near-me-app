import { describe, expect, it } from "vitest";
import { courseProfileForEvent } from "@/lib/course-profile";

describe("courseProfileForEvent", () => {
  it("returns the organiser-published North Downs Run course", () => {
    expect(courseProfileForEvent("north-downs-run-2026")).toEqual({
      eventSlug: "north-downs-run-2026",
      organiser: "Istead & Ifield Harriers",
      routeName: "North Downs Run course",
      routeUrl: "https://www.plotaroute.com/route/2277816?units=km",
      embedUrl: "https://www.plotaroute.com/routeviewer/2277816?self=1&units=km",
      distanceLabel: "29.8 km",
      ascentLabel: "469 m",
      terrainLabel: "Mixed terrain",
    });
  });

  it("does not enrich any other event page", () => {
    expect(courseProfileForEvent("another-event")).toBeNull();
    expect(courseProfileForEvent("north-downs-run")).toBeNull();
  });
});
