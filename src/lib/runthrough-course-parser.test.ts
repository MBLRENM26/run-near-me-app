import { describe, expect, it } from "vitest";
import {
  advertisedDistanceKeys,
  canonicalRunThroughEventUrl,
  eventMatchesRunThroughPage,
  exactRoutesForEvent,
  parseRunThroughPage,
  parseStravaEmbed,
} from "@/lib/runthrough-course-parser";

describe("RunThrough course parsing", () => {
  it("accepts canonical event pages but rejects the homepage and other hosts", () => {
    expect(
      canonicalRunThroughEventUrl(
        "https://www.runthrough.co.uk/event/town-moor-2026?gclid=tracking",
      ),
    ).toBe("https://www.runthrough.co.uk/event/town-moor-2026");
    expect(canonicalRunThroughEventUrl("https://www.runthrough.co.uk/")).toBeNull();
    expect(canonicalRunThroughEventUrl("https://example.com/event/town-moor")).toBeNull();
  });

  it("extracts unique organiser-designated Strava route IDs", () => {
    expect(
      parseRunThroughPage(`
        <h1>Newcastle Town Moor Half Marathon, 10k &amp; 5k October 2026</h1>
        <iframe src="https://strava-embeds.com/route/111?style=standard"></iframe>
        <iframe src="https://strava-embeds.com/route/111?style=standard"></iframe>
        <iframe src="https://strava-embeds.com/route/222?style=standard"></iframe>
      `),
    ).toEqual({
      eventName: "Newcastle Town Moor Half Marathon, 10k & 5k October 2026",
      routeIds: ["111", "222"],
    });
  });

  it("requires a shared event-specific name token", () => {
    expect(
      eventMatchesRunThroughPage(
        "RunThrough Town Moor 5k, 10k & Half Marathon 2026",
        "Newcastle Town Moor Half Marathon, 10k, 5k & Junior Race October 2026",
      ),
    ).toBe(true);
    expect(eventMatchesRunThroughPage("Cardiff 10k 2026", "Altrincham 10k 2026")).toBe(false);
  });

  it("parses Strava distance and elevation metadata", () => {
    expect(
      parseStravaEmbed(
        `<h1 class="title">Town Moor 5K | RunThrough</h1>
         <div class="stat-label">Distance</div><div class="stat-value">5.1 km</div>
         <div class="stat-label">Elev Gain</div><div class="stat-value">21 m</div>`,
        "3421125722292623984",
      ),
    ).toEqual({
      providerRouteId: "3421125722292623984",
      routeName: "Town Moor 5K | RunThrough",
      distanceKm: 5.1,
      ascentM: 21,
      distanceKey: "5k",
    });
  });

  it("publishes only exact distances advertised by the RENM occurrence", () => {
    const routes = [
      { providerRouteId: "1", routeName: "5K", distanceKm: 5.1, ascentM: 21, distanceKey: "5k" },
      { providerRouteId: "2", routeName: "10K", distanceKm: 10.2, ascentM: 45, distanceKey: "10k" },
      { providerRouteId: "3", routeName: "Junior", distanceKm: 1.1, ascentM: 4, distanceKey: null },
    ];
    expect(advertisedDistanceKeys("5 km, 10 km")).toEqual(new Set(["5k", "10k"]));
    expect(exactRoutesForEvent({ distances: "5 km, 10 km" }, routes)).toEqual({
      publishable: routes.slice(0, 2),
      unresolved: routes.slice(2),
    });
    expect(exactRoutesForEvent({ distances: "Various" }, routes).publishable).toEqual([]);
  });

  it("withholds duplicate routes for the same distance as ambiguous", () => {
    const routes = [
      {
        providerRouteId: "1",
        routeName: "Example 10K A",
        distanceKm: 10.1,
        ascentM: 50,
        distanceKey: "10k",
      },
      {
        providerRouteId: "2",
        routeName: "Example 10K B",
        distanceKm: 10.2,
        ascentM: 55,
        distanceKey: "10k",
      },
    ];
    expect(exactRoutesForEvent({ distances: "10K" }, routes)).toEqual({
      publishable: [],
      unresolved: routes,
    });
  });
});
