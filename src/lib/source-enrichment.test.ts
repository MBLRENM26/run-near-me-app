import { describe, expect, it } from "vitest";
import {
  buildSourceEnrichment,
  coordinateDistanceMiles,
  deriveRaceProfile,
  resolveSourceCoordinates,
} from "./source-enrichment";

describe("source enrichment", () => {
  it("replaces a clear source-coordinate outlier with postcode evidence", () => {
    const source = { lat: 55.9317211, lng: -3.1545964 };
    const postcode = { lat: 55.600678, lng: -4.486062 };
    expect(coordinateDistanceMiles(source, postcode)).toBeGreaterThan(50);
    expect(resolveSourceCoordinates({ source, postcode })).toEqual(postcode);
  });

  it("uses source, postcode, then existing coordinates in evidence order", () => {
    const source = { lat: 56, lng: -3 };
    const nearbyPostcode = { lat: 56.01, lng: -3.01 };
    const existing = { lat: 55, lng: -4 };
    expect(resolveSourceCoordinates({ source, postcode: nearbyPostcode, existing })).toEqual(
      source,
    );
    expect(resolveSourceCoordinates({ postcode: nearbyPostcode, existing })).toEqual(
      nearbyPostcode,
    );
    expect(resolveSourceCoordinates({ existing })).toEqual(existing);
  });

  it("derives repeatable profiles from supported source evidence", () => {
    expect(
      deriveRaceProfile({ discipline: "Road Race", distanceTags: ["10k"], terrainTags: ["road"] }),
    ).toBe("road_race");
    expect(
      deriveRaceProfile({
        discipline: "Road Race / Multi Terrain",
        distanceTags: [],
        terrainTags: ["road", "multi-terrain"],
      }),
    ).toBe("multi_terrain");
    expect(
      deriveRaceProfile({
        discipline: "Trail Race / Ultra Distance",
        distanceTags: ["ultra"],
        terrainTags: ["trail"],
      }),
    ).toBe("ultra");
  });

  it("preserves curated tags and reviewed taxonomy", () => {
    const result = buildSourceEnrichment({
      name: "Example 10K Road Race",
      distances: "10K",
      discipline: "Road Race",
      governance: "england_athletics",
      existing: {
        is_curated_tags: true,
        distance_tags: ["5-mile"],
        terrain_tags: ["trail"],
        governance: "tra",
        race_profile: "trail_race",
      },
    });
    expect(result).toMatchObject({
      distance_tags: ["5-mile"],
      terrain_tags: ["trail"],
      governance: "tra",
      race_profile: "trail_race",
    });
  });
});
