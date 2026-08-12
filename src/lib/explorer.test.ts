import { describe, expect, it } from "vitest";
import {
  displayValue,
  distanceMiles,
  explorerReasonLabels,
  matchesExplorerRadius,
  type ExplorerEvent,
} from "./explorer";

const event: ExplorerEvent = {
  id: "event-1",
  slug: "sample-10k",
  name: "Sample 10K",
  dateRaw: "12 Sep 2026",
  sortDate: "2026-09-12",
  dateFrom: "2026-09-12",
  dateTo: "2026-09-12",
  dateIsEstimated: false,
  isRecurring: false,
  town: "London",
  county: "London",
  region: "london",
  distances: "10K",
  distanceTags: ["10k"],
  terrainTags: ["road"],
  governance: "england_athletics",
  organiserType: "club",
  raceProfile: "road_race",
  entryFee: null,
  distanceMiles: 4.25,
};

describe("Race Explorer helpers", () => {
  it("calculates and applies a radius without PostGIS", () => {
    const londonToGreenwich = distanceMiles(51.5074, -0.1278, 51.4826, 0.0077);
    expect(londonToGreenwich).toBeGreaterThan(5);
    expect(londonToGreenwich).toBeLessThan(7);
    expect(matchesExplorerRadius({ lat: 51.5074, lng: -0.1278, radius: 10 }, 51.4826, 0.0077)).toBe(
      true,
    );
  });

  it("does not claim a location match when coordinates are missing", () => {
    expect(matchesExplorerRadius({ lat: 51.5074, lng: -0.1278, radius: 25 }, null, null)).toBe(
      false,
    );
    expect(matchesExplorerRadius({ radius: 25 }, null, null)).toBe(true);
  });

  it("builds concise, evidence-backed match reasons", () => {
    expect(explorerReasonLabels(event)).toEqual(["4.3 miles away", "10k", "Road"]);
  });

  it("uses stable display labels for governed values", () => {
    expect(displayValue("england_athletics")).toBe("England Athletics");
    expect(displayValue("half-marathon")).toBe("Half marathon");
  });
});
