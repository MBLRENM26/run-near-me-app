import { haversineKm } from "@/lib/cities";

export const EXPLORER_RADII = [10, 25, 50] as const;
export type ExplorerRadius = (typeof EXPLORER_RADII)[number];

export const EXPLORER_DISTANCE_VALUES = [
  "all",
  "5k",
  "10k",
  "half-marathon",
  "marathon",
  "ultra",
] as const;
export type ExplorerDistance = (typeof EXPLORER_DISTANCE_VALUES)[number];

export const EXPLORER_TERRAIN_VALUES = ["all", "road", "trail", "multi-terrain", "fell"] as const;
export type ExplorerTerrain = (typeof EXPLORER_TERRAIN_VALUES)[number];

export const EXPLORER_GOVERNANCE_VALUES = [
  "all",
  "england_athletics",
  "scottish_athletics",
  "welsh_athletics",
  "athletics_ni",
  "tra",
] as const;
export type ExplorerGovernance = (typeof EXPLORER_GOVERNANCE_VALUES)[number];

export const EXPLORER_PROFILE_VALUES = [
  "all",
  "road_race",
  "trail_race",
  "multi_terrain",
  "fell_race",
  "ultra",
] as const;
export type ExplorerProfile = (typeof EXPLORER_PROFILE_VALUES)[number];

export const EXPLORER_DATE_MODES = ["dated", "recurring"] as const;
export type ExplorerDateMode = (typeof EXPLORER_DATE_MODES)[number];

export const EXPLORER_SORT_VALUES = ["date", "distance"] as const;
export type ExplorerSort = (typeof EXPLORER_SORT_VALUES)[number];

export type ExplorerQuery = {
  q: string;
  lat?: number;
  lng?: number;
  label?: string;
  radius: ExplorerRadius;
  distance: ExplorerDistance;
  terrain: ExplorerTerrain;
  governance: ExplorerGovernance;
  profile: ExplorerProfile;
  dateMode: ExplorerDateMode;
  sort: ExplorerSort;
};

export type ExplorerEvent = {
  id: string;
  slug: string;
  name: string;
  dateRaw: string | null;
  sortDate: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  dateIsEstimated: boolean;
  isRecurring: boolean;
  town: string | null;
  county: string | null;
  region: string | null;
  distances: string | null;
  distanceTags: string[];
  terrainTags: string[];
  governance: string | null;
  organiserType: string | null;
  raceProfile: string | null;
  entryFee: string | null;
  distanceMiles: number | null;
};

export type ExplorerResult = {
  events: ExplorerEvent[];
  total: number;
  capped: boolean;
};

export function hasCoordinates(
  query: Pick<ExplorerQuery, "lat" | "lng">,
): query is ExplorerQuery & { lat: number; lng: number } {
  return Number.isFinite(query.lat) && Number.isFinite(query.lng);
}

export function distanceMiles(
  lat: number,
  lng: number,
  eventLat: number,
  eventLng: number,
): number {
  return haversineKm(lat, lng, eventLat, eventLng) * 0.621371;
}

export function matchesExplorerRadius(
  query: Pick<ExplorerQuery, "lat" | "lng" | "radius">,
  eventLat: number | null,
  eventLng: number | null,
): boolean {
  if (!hasCoordinates(query)) return true;
  if (eventLat == null || eventLng == null) return false;
  return distanceMiles(query.lat, query.lng, eventLat, eventLng) <= query.radius;
}

export function explorerReasonLabels(event: ExplorerEvent): string[] {
  const labels: string[] = [];
  if (event.distanceMiles != null) {
    labels.push(`${event.distanceMiles.toFixed(1)} miles away`);
  }
  if (event.distanceTags.length) {
    labels.push(event.distanceTags.slice(0, 2).map(displayValue).join(" + "));
  } else if (event.distances) {
    labels.push(event.distances);
  }
  if (event.terrainTags.length) {
    labels.push(event.terrainTags.slice(0, 2).map(displayValue).join(" + "));
  }
  if (event.governance && event.governance !== "unknown") {
    labels.push(displayValue(event.governance));
  }
  return labels.slice(0, 3);
}

export function displayValue(value: string): string {
  const known: Record<string, string> = {
    england_athletics: "England Athletics",
    scottish_athletics: "Scottish Athletics",
    welsh_athletics: "Welsh Athletics",
    athletics_ni: "Athletics NI",
    tra: "Trail Running Association",
    road_race: "Road race",
    trail_race: "Trail race",
    multi_terrain: "Multi-terrain",
    fell_race: "Fell race",
    "half-marathon": "Half marathon",
    "multi-terrain": "Multi-terrain",
  };
  return (
    known[value] ??
    value
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}
