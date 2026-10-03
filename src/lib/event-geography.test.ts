import { describe, expect, it } from "vitest";
import { checkEventGeography, normaliseEventRegion } from "./event-geography";

describe("import geography evidence", () => {
  it("retains coastal UK venues outside the narrower discovery window", () => {
    expect(checkEventGeography({ country: "England", lat: 49.892, lng: -6.344 })).toEqual([]);
  });
  it("holds explicit nation contradictions even when county would mask them", () => {
    expect(
      checkEventGeography({ country: "Scotland", region: "England", county: "Scotland" }),
    ).toContain("country_region_conflict");
  });
  it.each([
    [52.8381640101579, -2.32748084361657],
    [52.83816401, -2.327480844],
  ])("rejects historic fallback coordinates including rounded copies", (lat, lng) => {
    expect(checkEventGeography({ lat, lng })).toContain("known_fallback_coordinates");
  });
  it("does not reject a different nearby real location", () => {
    expect(checkEventGeography({ country: "England", lat: 52.839, lng: -2.328 })).toEqual([]);
  });
  it("holds an international label paired with a UK point and no resolving country", () => {
    expect(checkEventGeography({ county: "International", lat: 51.5, lng: -0.1 })).toContain(
      "international_county_with_uk_geography",
    );
    expect(
      checkEventGeography({ county: "International", country: "Ireland", lat: 53.35, lng: -6.26 }),
    ).toEqual([]);
  });
  it.each([{ lat: 51 }, { lng: 0 }, { lat: null, lng: -3 }])(
    "requires a coordinate pair: %j",
    (row) => {
      expect(checkEventGeography(row)).toContain("coordinate_pair_required");
    },
  );
  it("permits missing coordinates and undated recurring UK venues", () => {
    expect(checkEventGeography({ country: "United Kingdom", lat: null, lng: null })).toEqual([]);
    expect(checkEventGeography({})).toEqual([]);
  });
  it("rejects zero coordinates, overseas points labelled UK and conflicting country/region", () => {
    expect(checkEventGeography({ lat: 0, lng: 0 })).toContain("zero_coordinates");
    expect(checkEventGeography({ country: "England", lat: -37.8186, lng: 144.9756 })).toContain(
      "uk_country_outside_bounds",
    );
    expect(checkEventGeography({ country: "England", region: "Wales" })).toContain(
      "country_region_conflict",
    );
    expect(checkEventGeography({ country: "Spain", region: "West Midlands" })).toContain(
      "overseas_country_with_uk_region",
    );
    expect(checkEventGeography({ county: "International", country: "England" })).toContain(
      "international_county_with_uk_geography",
    );
  });
  it("never uses the coarse UK envelope as proof of another country's border", () => {
    // Dublin is in the rectangular envelope, but is a valid Irish location.
    const row = { country: "Ireland", lat: 53.35, lng: -6.26 };
    expect(checkEventGeography(row)).toEqual([]);
    expect(normaliseEventRegion(row)).toBeNull();
  });
  it("keeps supported UK grouping and prevents invented UK regions overseas", () => {
    expect(normaliseEventRegion({ country: "England", county: "West Yorkshire" })).toBe(
      "Yorkshire",
    );
    expect(normaliseEventRegion({ country: "United Kingdom", region: "United Kingdom" })).toBe(
      "United Kingdom",
    );
    expect(normaliseEventRegion({ country: "Australia", lat: -37.8, lng: 144.9 })).toBeNull();
    expect(normaliseEventRegion({ county: "International" })).toBeNull();
  });
});
