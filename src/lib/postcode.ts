// Full UK postcode (case + space insensitive), e.g. "DA9 9AA".
const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
// Outward code only, e.g. "DA9", "ME5", "SW1A", "W1".
const OUTWARD_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export function isUkPostcode(q: string): boolean {
  return FULL_POSTCODE.test(q.trim());
}

export function isUkOutwardCode(q: string): boolean {
  return OUTWARD_POSTCODE.test(q.trim());
}

export function isUkPostcodeOrOutward(q: string): boolean {
  return isUkPostcode(q) || isUkOutwardCode(q);
}

/** Normalise to canonical "AA9A 9AA" spacing (uppercased, single space). */
export function normalisePostcode(q: string): string {
  const compact = q.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length < 5) return compact;
  return `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
}

export type GeocodedPostcode = {
  postcode: string;
  lat: number;
  lng: number;
};

/** Browser geocoder via postcodes.io. Returns null on miss/network error. */
export async function geocodePostcode(
  q: string,
): Promise<GeocodedPostcode | null> {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(q.trim())}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { postcode: string; latitude: number; longitude: number };
    };
    if (!json.result) return null;
    return {
      postcode: json.result.postcode,
      lat: json.result.latitude,
      lng: json.result.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Geocode an outward code (e.g. "DA9", "ME5") to its centroid via
 * postcodes.io `/outcodes/{outcode}`. Returns null on miss/network error.
 * The returned `postcode` is the uppercased outcode, suitable as a label.
 */
export async function geocodeOutward(
  q: string,
): Promise<GeocodedPostcode | null> {
  const outcode = q.trim().toUpperCase();
  try {
    const res = await fetch(
      `https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { outcode: string; latitude: number; longitude: number };
    };
    if (!json.result) return null;
    return {
      postcode: json.result.outcode ?? outcode,
      lat: json.result.latitude,
      lng: json.result.longitude,
    };
  } catch {
    return null;
  }
}

