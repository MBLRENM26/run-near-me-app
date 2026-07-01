// City hub config for radius-based landing pages
// (/running-events-in-city/$city). Coordinates are city-centre lat/lng
// (Wikipedia infobox values, rounded to 4 dp). The `county` field is used
// for breadcrumbs and for filtering the "cities in this county" chip row
// on county landing pages — it doesn't affect the radius query, which is
// driven purely by lat/lng.
//
// Inclusion gate: the page only ships when ≥10 events fall within the
// CITY_RADIUS_KM of the centroid AND pass the discovery link-trust filter
// (hasOrganiserOwnedLink). Cities that fall below the threshold are kept
// in this registry (so we can re-check on the next data pass) but are
// omitted from the sitemap and 404 on direct hit.

import type { Region } from "@/lib/regions";

export const CITY_RADIUS_KM = 25;

export type CityConfig = {
  slug: string;
  name: string;
  county: string; // display + county-page chip filter (not for query)
  region: Region["slug"];
  lat: number;
  lng: number;
};

export const CITIES: CityConfig[] = [
  // London (single centroid — 25km covers Greater London comfortably)
  { slug: "london", name: "London", county: "London", region: "london", lat: 51.5074, lng: -0.1278 },

  // South East
  { slug: "brighton", name: "Brighton", county: "East Sussex", region: "south-east", lat: 50.8225, lng: -0.1372 },
  { slug: "reading", name: "Reading", county: "Berkshire", region: "south-east", lat: 51.4543, lng: -0.9781 },
  { slug: "southampton", name: "Southampton", county: "Hampshire", region: "south-east", lat: 50.9097, lng: -1.4044 },
  { slug: "portsmouth", name: "Portsmouth", county: "Hampshire", region: "south-east", lat: 50.8198, lng: -1.0880 },
  { slug: "oxford", name: "Oxford", county: "Oxfordshire", region: "south-east", lat: 51.7520, lng: -1.2577 },
  { slug: "milton-keynes", name: "Milton Keynes", county: "Buckinghamshire", region: "south-east", lat: 52.0406, lng: -0.7594 },

  // South West
  { slug: "bristol", name: "Bristol", county: "Bristol", region: "south-west", lat: 51.4545, lng: -2.5879 },
  { slug: "plymouth", name: "Plymouth", county: "Devon", region: "south-west", lat: 50.3755, lng: -4.1427 },
  { slug: "exeter", name: "Exeter", county: "Devon", region: "south-west", lat: 50.7184, lng: -3.5339 },
  { slug: "bath", name: "Bath", county: "Somerset", region: "south-west", lat: 51.3811, lng: -2.3590 },
  { slug: "bournemouth", name: "Bournemouth", county: "Dorset", region: "south-west", lat: 50.7192, lng: -1.8808 },

  // East of England
  { slug: "cambridge", name: "Cambridge", county: "Cambridgeshire", region: "east-of-england", lat: 52.2053, lng: 0.1218 },
  { slug: "norwich", name: "Norwich", county: "Norfolk", region: "east-of-england", lat: 52.6309, lng: 1.2974 },

  // East Midlands
  { slug: "nottingham", name: "Nottingham", county: "Nottinghamshire", region: "east-midlands", lat: 52.9548, lng: -1.1581 },
  { slug: "leicester", name: "Leicester", county: "Leicestershire", region: "east-midlands", lat: 52.6369, lng: -1.1398 },
  { slug: "derby", name: "Derby", county: "Derbyshire", region: "east-midlands", lat: 52.9225, lng: -1.4746 },

  // West Midlands
  { slug: "birmingham", name: "Birmingham", county: "West Midlands", region: "west-midlands", lat: 52.4862, lng: -1.8904 },
  { slug: "coventry", name: "Coventry", county: "West Midlands", region: "west-midlands", lat: 52.4068, lng: -1.5197 },
  { slug: "wolverhampton", name: "Wolverhampton", county: "West Midlands", region: "west-midlands", lat: 52.5862, lng: -2.1288 },
  { slug: "stoke-on-trent", name: "Stoke-on-Trent", county: "Staffordshire", region: "west-midlands", lat: 53.0027, lng: -2.1794 },

  // Yorkshire
  { slug: "leeds", name: "Leeds", county: "West Yorkshire", region: "yorkshire", lat: 53.8008, lng: -1.5491 },
  { slug: "sheffield", name: "Sheffield", county: "South Yorkshire", region: "yorkshire", lat: 53.3811, lng: -1.4701 },
  { slug: "bradford", name: "Bradford", county: "West Yorkshire", region: "yorkshire", lat: 53.7960, lng: -1.7594 },
  { slug: "york", name: "York", county: "North Yorkshire", region: "yorkshire", lat: 53.9600, lng: -1.0873 },
  { slug: "hull", name: "Hull", county: "East Riding of Yorkshire", region: "yorkshire", lat: 53.7676, lng: -0.3274 },

  // North West
  { slug: "manchester", name: "Manchester", county: "Greater Manchester", region: "north-west", lat: 53.4808, lng: -2.2426 },
  { slug: "liverpool", name: "Liverpool", county: "Merseyside", region: "north-west", lat: 53.4084, lng: -2.9916 },
  { slug: "preston", name: "Preston", county: "Lancashire", region: "north-west", lat: 53.7632, lng: -2.7031 },
  { slug: "blackpool", name: "Blackpool", county: "Lancashire", region: "north-west", lat: 53.8175, lng: -3.0357 },

  // North East
  { slug: "newcastle", name: "Newcastle upon Tyne", county: "Tyne and Wear", region: "north-east", lat: 54.9784, lng: -1.6174 },
  { slug: "sunderland", name: "Sunderland", county: "Tyne and Wear", region: "north-east", lat: 54.9060, lng: -1.3812 },
  { slug: "middlesbrough", name: "Middlesbrough", county: "North Yorkshire", region: "north-east", lat: 54.5742, lng: -1.2350 },

  // Scotland
  { slug: "edinburgh", name: "Edinburgh", county: "Edinburgh", region: "scotland", lat: 55.9533, lng: -3.1883 },
  { slug: "glasgow", name: "Glasgow", county: "Glasgow", region: "scotland", lat: 55.8642, lng: -4.2518 },
  { slug: "aberdeen", name: "Aberdeen", county: "Aberdeenshire", region: "scotland", lat: 57.1497, lng: -2.0943 },
  { slug: "dundee", name: "Dundee", county: "Dundee", region: "scotland", lat: 56.4620, lng: -2.9707 },

  // Wales
  { slug: "cardiff", name: "Cardiff", county: "Cardiff", region: "wales", lat: 51.4816, lng: -3.1791 },
  { slug: "swansea", name: "Swansea", county: "Swansea", region: "wales", lat: 51.6214, lng: -3.9436 },

  // Northern Ireland
  { slug: "belfast", name: "Belfast", county: "Belfast", region: "northern-ireland", lat: 54.5973, lng: -5.9301 },
];

export function cityBySlug(slug: string): CityConfig | null {
  return CITIES.find((c) => c.slug === slug) ?? null;
}

/**
 * Haversine distance in km between two lat/lng points.
 * Kept in one place so the loader and any nearby-city helper agree.
 */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aLatR = (aLat * Math.PI) / 180;
  const bLatR = (bLat * Math.PI) / 180;
  const a = s1 * s1 + Math.cos(aLatR) * Math.cos(bLatR) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The N closest registry cities to `city`, excluding `city` itself. */
export function nearestCities(
  city: CityConfig,
  n: number,
  maxKm = 80,
): CityConfig[] {
  return CITIES.filter((c) => c.slug !== city.slug)
    .map((c) => ({
      city: c,
      km: haversineKm(city.lat, city.lng, c.lat, c.lng),
    }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
    .map((x) => x.city);
}
