// Full UK postcode (case + space insensitive). We only treat the input
// as a postcode when it parses as a complete one — partial codes like
// "BD9" stay as text searches so users get name/town matches.
const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function isUkPostcode(q: string): boolean {
  return FULL_POSTCODE.test(q.trim());
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
