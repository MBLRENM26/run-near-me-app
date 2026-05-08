// Haversine distance in miles between two lat/lng pairs
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type EventType =
  | "all"
  | "5k"
  | "10k"
  | "half"
  | "marathon"
  | "trail"
  | "ultra";

export function matchesEventType(
  distanceType: string | null | undefined,
  type: EventType,
): boolean {
  if (type === "all") return true;
  if (!distanceType) return false;
  const s = distanceType.toLowerCase();
  switch (type) {
    case "5k":
      return /\b5k\b/.test(s);
    case "10k":
      return /\b10k\b/.test(s);
    case "half":
      return s.includes("half");
    case "marathon":
      // Match "marathon" but not "half marathon"
      return /(?<!half\s)marathon/.test(s) && !s.includes("ultra");
    case "trail":
      return s.includes("trail");
    case "ultra":
      return s.includes("ultra");
  }
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return "Less than 0.1 miles away";
  return `${miles.toFixed(1)} miles away`;
}
