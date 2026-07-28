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

/**
 * Coarse outline of Wales as [lng, lat] pairs, traced clockwise from
 * Anglesey along the north coast, down the English border, out along
 * the south coast and back up the west coast. Accurate to a few km —
 * enough to separate Welsh border towns (Monmouth, Wrexham, Flint)
 * from English ones (Chester, Shrewsbury, Hereford, Bristol,
 * Weston-super-Mare) and the whole Merseyside/Wirral coast.
 */
const WALES_POLYGON: [number, number][] = [
  [-4.7, 53.42], // Anglesey NW
  [-3.9, 53.35], // north coast
  [-3.45, 53.36], // Prestatyn
  [-3.1, 53.28], // Point of Ayr, west side of the Dee estuary
  [-2.95, 53.2], // Deeside border
  [-2.95, 53.0], // Wrexham border
  [-3.05, 52.86], // west of Oswestry
  [-3.15, 52.7], // Shropshire border
  [-3.1, 52.55], // Montgomery
  [-3.05, 52.35], // Knighton
  [-3.1, 52.15], // Hay-on-Wye
  [-2.95, 51.95], // Monmouthshire border
  [-2.66, 51.81], // Monmouth
  [-2.66, 51.62], // Chepstow / Severn Bridge
  [-2.99, 51.51], // Newport coast
  [-3.16, 51.44], // Cardiff coast
  [-3.29, 51.37], // Barry
  [-3.6, 51.38], // Glamorgan coast
  [-4.3, 51.55], // Gower / Carmarthen Bay
  [-5.3, 51.68], // Pembrokeshire
  [-4.6, 52.1], // Cardigan Bay
  [-4.8, 52.85], // Llŷn peninsula tip
  [-4.35, 53.1], // Caernarfon
  [-4.8, 53.25], // Holy Island / west Anglesey

  [-4.7, 53.42], // close
];

function isInWales(lat: number, lng: number): boolean {
  let inside = false;
  for (
    let i = 0, j = WALES_POLYGON.length - 1;
    i < WALES_POLYGON.length;
    j = i++
  ) {
    const [xi, yi] = WALES_POLYGON[i];
    const [xj, yj] = WALES_POLYGON[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

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
  // Wales — polygon test. A longitude cut mislabels Merseyside/Wirral,
  // Cheshire, Shropshire, Herefordshire and the Somerset side of the
  // Severn estuary as Welsh, because England's coast reaches further
  // west than the Welsh border at those latitudes.
  if (isInWales(lat, lng)) return "wales";

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
