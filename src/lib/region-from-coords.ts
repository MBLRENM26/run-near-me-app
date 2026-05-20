// Coarse runtime UK region mapper from lat/lng.
// Used for parkrun rows where `region` is uniformly "United Kingdom".
// Order matters: more specific buckets (NI, Scotland, Wales, London) first.
import { REGIONS, type Region } from "@/lib/regions";

export type UKRegionSlug =
  | "northern-ireland"
  | "scotland"
  | "wales"
  | "london"
  | "north-east"
  | "north-west"
  | "yorkshire"
  | "east-midlands"
  | "west-midlands"
  | "east-of-england"
  | "south-east"
  | "south-west";

export function regionFromCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): UKRegionSlug | null {
  if (lat == null || lng == null) return null;
  if (lat < 49.5 || lat > 61 || lng < -8.7 || lng > 2.0) return null;

  // Northern Ireland
  if (lat >= 53.9 && lat <= 55.4 && lng <= -5.3) return "northern-ireland";
  // Scotland (everything north of ~55, plus Borders that extends a touch south)
  if (lat >= 54.85) return "scotland";
  // Wales
  if (lat >= 51.3 && lat <= 53.5 && lng <= -2.65) return "wales";
  // London (greater London bbox)
  if (lat >= 51.28 && lat <= 51.72 && lng >= -0.55 && lng <= 0.32)
    return "london";
  // North East
  if (lat >= 54.3 && lng > -2.65) return "north-east";
  // North West
  if (lat >= 53.3 && lat < 54.85 && lng <= -2.0) return "north-west";
  // Yorkshire & Humber
  if (lat >= 53.3 && lat < 54.5 && lng > -2.4 && lng <= 0.3) return "yorkshire";
  // East Midlands
  if (lat >= 52.3 && lat < 53.5 && lng > -1.7 && lng <= 0.6)
    return "east-midlands";
  // West Midlands
  if (lat >= 51.95 && lat < 53.3 && lng > -3.2 && lng <= -1.3)
    return "west-midlands";
  // East of England
  if (lat >= 51.45 && lat < 53.0 && lng > 0.0 && lng <= 1.85)
    return "east-of-england";
  // South West
  if (lat < 52.0 && lng <= -2.0) return "south-west";
  // South East (catch-all for the south)
  return "south-east";
}

const SLUG_TO_REGION = new Map<string, Region>(REGIONS.map((r) => [r.slug, r]));

export function regionFromCoordsName(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  const slug = regionFromCoords(lat, lng);
  return slug ? (SLUG_TO_REGION.get(slug)?.name ?? null) : null;
}
