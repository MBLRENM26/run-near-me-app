import { parseEventTags, type DistanceTag, type TerrainTag } from "@/lib/event-tags";
import type { Database } from "@/integrations/supabase/types";

export type Coordinates = { lat: number; lng: number };

export type ExistingSourceEnrichment = {
  lat?: number | null;
  lng?: number | null;
  distance_tags?: string[] | null;
  terrain_tags?: string[] | null;
  is_curated_tags?: boolean | null;
  governance?: string | null;
  race_profile?: string | null;
};

type RaceProfile = Database["public"]["Enums"]["event_race_profile"];
type Governance = Database["public"]["Enums"]["event_governance"];

function finiteCoordinates(lat: number | null | undefined, lng: number | null | undefined) {
  return typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng)
    ? { lat, lng }
    : null;
}

export function coordinateDistanceMiles(a: Coordinates, b: Coordinates): number {
  const earthRadiusMiles = 3958.7613;
  const radians = Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * radians;
  const deltaLng = (b.lng - a.lng) * radians;
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(value));
}

/**
 * Prefer source coordinates, except when a full-postcode result demonstrates
 * that they are a clear outlier. Missing source coordinates use the postcode
 * result; an existing database value is the final fail-safe.
 */
export function resolveSourceCoordinates(input: {
  source?: Coordinates | null;
  postcode?: Coordinates | null;
  existing?: Coordinates | null;
  outlierMiles?: number;
}): Coordinates | null {
  const outlierMiles = input.outlierMiles ?? 5;
  if (
    input.source &&
    input.postcode &&
    coordinateDistanceMiles(input.source, input.postcode) > outlierMiles
  ) {
    return input.postcode;
  }
  return input.source ?? input.postcode ?? input.existing ?? null;
}

export function deriveRaceProfile(input: {
  discipline?: string | null;
  distanceTags: readonly string[];
  terrainTags: readonly string[];
}): RaceProfile | null {
  const discipline = input.discipline?.trim().toLowerCase() ?? "";
  if (input.distanceTags.includes("ultra")) return "ultra";
  if (input.terrainTags.includes("fell")) return "fell_race";
  if (input.terrainTags.includes("cross-country")) return "cross_country";
  if (input.terrainTags.includes("trail")) return "trail_race";
  if (input.terrainTags.includes("multi-terrain")) return "multi_terrain";
  if (input.terrainTags.includes("track")) return "track";
  if (input.terrainTags.includes("road")) return "road_race";
  if (discipline === "hill running") return "fell_race";
  if (discipline === "cross country" || discipline === "cross-country") return "cross_country";
  if (discipline.includes("trail")) return "trail_race";
  if (discipline.includes("multi-terrain") || discipline.includes("multi terrain")) {
    return "multi_terrain";
  }
  if (discipline.includes("road")) return "road_race";
  return null;
}

/** Build the repeatable source-owned fields while retaining human review. */
export function buildSourceEnrichment(input: {
  name: string;
  distances?: string | null;
  discipline?: string | null;
  governance: Governance;
  coordinates?: Coordinates | null;
  existing?: ExistingSourceEnrichment | null;
}) {
  const existing = input.existing ?? null;
  const parsed = parseEventTags({
    name: input.name,
    distances: input.distances,
    discipline: input.discipline,
  });
  const distanceTags = existing?.is_curated_tags
    ? ((existing.distance_tags ?? []) as DistanceTag[])
    : parsed.distance_tags;
  const terrainTags = existing?.is_curated_tags
    ? ((existing.terrain_tags ?? []) as TerrainTag[])
    : parsed.terrain_tags;
  const existingCoordinates = finiteCoordinates(existing?.lat, existing?.lng);
  const coordinates = input.coordinates ?? existingCoordinates;

  return {
    ...(coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : { lat: null, lng: null }),
    distance_tags: distanceTags,
    terrain_tags: terrainTags,
    governance: (existing?.governance || input.governance) as Governance,
    race_profile:
      (existing?.race_profile as RaceProfile | null | undefined) ??
      deriveRaceProfile({
        discipline: input.discipline,
        distanceTags,
        terrainTags,
      }),
  };
}
