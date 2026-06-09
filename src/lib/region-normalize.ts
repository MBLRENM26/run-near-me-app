// Normalise broad region labels ("England", "UK") to the specific UK
// regions used by the site's regional pages. Mirrors the SQL backfill
// applied to existing rows — keep the two in sync.
import { regionFromCoordsName } from "@/lib/region-from-coords";

const COUNTY_TO_REGION: Record<string, string> = {
  // London
  London: "London",
  "Greater London": "London",
  Middlesex: "London",
  // South East
  Kent: "South East",
  Surrey: "South East",
  Hampshire: "South East",
  Berkshire: "South East",
  "East Sussex": "South East",
  "West Sussex": "South East",
  Oxfordshire: "South East",
  Buckinghamshire: "South East",
  "Isle of Wight": "South East",
  // South West
  Devon: "South West",
  Gloucestershire: "South West",
  Dorset: "South West",
  Somerset: "South West",
  Wiltshire: "South West",
  Bristol: "South West",
  Cornwall: "South West",
  "Cornwall and Isles of Scilly": "South West",
  "Isles of Scilly": "South West",
  // East of England
  Essex: "East of England",
  Cambridgeshire: "East of England",
  Norfolk: "East of England",
  Suffolk: "East of England",
  Hertfordshire: "East of England",
  Bedfordshire: "East of England",
  // East Midlands
  Derbyshire: "East Midlands",
  Lincolnshire: "East Midlands",
  Northamptonshire: "East Midlands",
  Nottinghamshire: "East Midlands",
  Leicestershire: "East Midlands",
  Rutland: "East Midlands",
  // West Midlands
  Staffordshire: "West Midlands",
  Shropshire: "West Midlands",
  Worcestershire: "West Midlands",
  "West Midlands": "West Midlands",
  Warwickshire: "West Midlands",
  Herefordshire: "West Midlands",
  // Yorkshire
  "West Yorkshire": "Yorkshire",
  "North Yorkshire": "Yorkshire",
  "South Yorkshire": "Yorkshire",
  "East Riding of Yorkshire": "Yorkshire",
  "East Yorkshire": "Yorkshire",
  // North West
  Lancashire: "North West",
  Cumbria: "North West",
  "Greater Manchester": "North West",
  Cheshire: "North West",
  Merseyside: "North West",
  // North East
  "Tyne and Wear": "North East",
  Northumberland: "North East",
  "County Durham": "North East",
  Durham: "North East",
  Cleveland: "North East",
  // Nations
  Wales: "Wales",
  "South Wales": "Wales",
  "North Wales": "Wales",
  "Mid Wales": "Wales",
  Powys: "Wales",
  Scotland: "Scotland",
  "Northern Ireland": "Northern Ireland",
};

// Broad labels that should be replaced with a specific region when possible.
// "United Kingdom" is deliberately excluded — it is the parkrun marker and
// parkrun pages map regions at runtime from coordinates.
const BROAD_REGIONS = new Set(["England", "UK", "Great Britain", "GB"]);

/**
 * Returns a specific UK region name for an incoming event, preferring
 * (1) an already-specific region label, (2) county mapping, (3) coords.
 * Falls back to the original value (or null) when nothing matches —
 * e.g. overseas events keep their broad label and stay off regional pages.
 */
export function normaliseRegion(
  region: string | null | undefined,
  county: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  const r = region?.trim() || null;
  if (r && !BROAD_REGIONS.has(r)) return r;

  const c = county?.trim();
  if (c && COUNTY_TO_REGION[c]) return COUNTY_TO_REGION[c];

  return regionFromCoordsName(lat, lng) ?? r;
}
