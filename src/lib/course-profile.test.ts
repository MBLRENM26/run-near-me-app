import { describe, expect, it } from "vitest";
import { courseProfileForEvent } from "@/lib/course-profile";

describe("courseProfileForEvent", () => {
  it("returns the organiser-published North Downs Run course", () => {
    expect(courseProfileForEvent("north-downs-run-2026")).toEqual({
      eventSlug: "north-downs-run-2026",
      organiser: "Istead & Ifield Harriers",
      provider: "plotaroute",
      providerLabel: "Plotaroute",
      introduction:
        "Istead & Ifield Harriers publish this official course for the North Downs Run. Explore the route and elevation profile below.",
      elevationMetricLabel: "Total ascent",
      terrainLabel: "Mixed terrain",
      routes: [
        {
          key: "course",
          label: "Course",
          routeName: "North Downs Run course",
          routeUrl: "https://www.plotaroute.com/route/2277816?units=km",
          embedUrl: "https://www.plotaroute.com/routeviewer/2277816?self=1&units=km",
          distanceLabel: "29.8 km",
          ascentLabel: "469 m",
        },
      ],
    });
  });

  it("returns three organiser-published Town Moor routes", () => {
    const course = courseProfileForEvent(
      "runthrough-town-moor-exhibition-park-5k-10k-half-marathon-2026",
    );

    expect(course?.provider).toBe("strava");
    expect(
      course?.routes.map(({ key, distanceLabel, ascentLabel }) => ({
        key,
        distanceLabel,
        ascentLabel,
      })),
    ).toEqual([
      { key: "5k", distanceLabel: "5.1 km", ascentLabel: "21 m" },
      { key: "10k", distanceLabel: "10.2 km", ascentLabel: "45 m" },
      { key: "half-marathon", distanceLabel: "21.6 km", ascentLabel: "99 m" },
    ]);
  });

  it("does not enrich any other event page", () => {
    expect(courseProfileForEvent("another-event")).toBeNull();
    expect(courseProfileForEvent("north-downs-run")).toBeNull();
  });
});
