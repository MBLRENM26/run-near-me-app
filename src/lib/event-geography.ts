import { normaliseRegion } from "./region-normalize";
import { REGIONS } from "./regions";

// This is a discovery envelope, not an exact national border.
export const UK_BOUNDS = { south: 49.9, north: 60.9, west: -8.6, east: 1.8 };
export const UK_COUNTRIES = [
  "England",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "United Kingdom",
  "UK",
  "GB",
  "GBR",
  "Great Britain",
];
const ukCountries = new Set(UK_COUNTRIES.map((country) => country.toLowerCase()));
const ukRegions = new Set([...REGIONS.map((region) => region.name.toLowerCase()), ...ukCountries]);
const nations = new Set(["england", "scotland", "wales", "northern ireland"]);

export function isUKCountry(country: string | null | undefined): boolean {
  return ukCountries.has(country?.trim().toLowerCase() ?? "");
}

export type EventGeography = {
  country?: string | null;
  county?: string | null;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function isInsideUKBounds(lat: number, lng: number): boolean {
  return (
    lat >= UK_BOUNDS.south &&
    lat <= UK_BOUNDS.north &&
    lng >= UK_BOUNDS.west &&
    lng <= UK_BOUNDS.east
  );
}

export type GeographyIssue =
  | "coordinate_pair_required"
  | "known_fallback_coordinates"
  | "zero_coordinates"
  | "uk_country_outside_bounds"
  | "international_county_with_uk_geography"
  | "overseas_country_with_uk_region"
  | "country_region_conflict";

/** Reject contradictory evidence; never guess a replacement country or venue. */
export function checkEventGeography(row: EventGeography): GeographyIssue[] {
  const issues: GeographyIssue[] = [];
  const country = row.country?.trim().toLowerCase() ?? "";
  const region = row.region?.trim().toLowerCase() ?? "";
  const hasPair = row.lat != null && row.lng != null;
  if ((row.lat == null) !== (row.lng == null)) issues.push("coordinate_pair_required");
  if (hasPair) {
    const lat = row.lat!;
    const lng = row.lng!;
    if (Math.abs(lat - 52.8381640101579) < 0.00001 && Math.abs(lng - -2.32748084361657) < 0.00001) {
      issues.push("known_fallback_coordinates");
    }
    if (lat === 0 && lng === 0) issues.push("zero_coordinates");
    // Ingestion uses a looser plausibility envelope than discovery so valid
    // coastal/island venues are not rejected by a directory boundary.
    if (isUKCountry(country) && (lat < 49.5 || lat > 61.2 || lng < -9 || lng > 2.5)) {
      issues.push("uk_country_outside_bounds");
    }
  }
  if (
    row.county?.trim().toLowerCase() === "international" &&
    (isUKCountry(country) ||
      ukRegions.has(region) ||
      (!country && hasPair && isInsideUKBounds(row.lat!, row.lng!)))
  ) {
    issues.push("international_county_with_uk_geography");
  }
  if (country && !isUKCountry(country) && ukRegions.has(region)) {
    issues.push("overseas_country_with_uk_region");
  }
  // Use explicit region/county text only for nation conflicts. The coarse
  // coordinate mapper cannot adjudicate border venues.
  const explicitRegion = nations.has(region)
    ? region
    : normaliseRegion(row.region, row.county, null, null)?.toLowerCase();
  if (nations.has(country) && explicitRegion && ukRegions.has(explicitRegion)) {
    const regionNation = nations.has(explicitRegion)
      ? explicitRegion
      : REGIONS.some((r) => r.name.toLowerCase() === explicitRegion)
        ? "england"
        : null;
    if (regionNation && regionNation !== country) issues.push("country_region_conflict");
  }
  return issues;
}

/** The region column is a UK grouping, so overseas venues get no UK region. */
export function normaliseEventRegion(row: EventGeography): string | null {
  if (row.country?.trim() && !isUKCountry(row.country)) return null;
  if (row.county?.trim().toLowerCase() === "international") return null;
  return normaliseRegion(row.region, row.county, row.lat, row.lng);
}
