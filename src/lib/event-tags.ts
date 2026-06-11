// Normalised tag taxonomy for events. Two orthogonal axes:
//   distance_tags  — numeric distance buckets ("5k", "10k", "30k", "marathon"…)
//   terrain_tags   — surface / discipline buckets ("road", "trail", "fell"…)
//
// The parser is the single source of truth for tagging logic. It reads
// `distances`, `discipline`, and `name` (in that priority for the relevant
// axis) and emits tag arrays. Curated rows (is_curated_tags=true) are not
// re-parsed.

import type { DistanceKey } from "@/lib/distance-filters";

export const DISTANCE_TAG_VALUES = [
  "1-mile",
  "fun-run",
  "5k",
  "5-mile",
  "10k",
  "10-mile",
  "15k",
  "20k",
  "20-mile",
  "half-marathon",
  "marathon",
  "30k",
  "50k",
  "100k",
  "ultra",
  "various",
  "other",
] as const;
export type DistanceTag = (typeof DISTANCE_TAG_VALUES)[number];

export const TERRAIN_TAG_VALUES = [
  "road",
  "trail",
  "multi-terrain",
  "fell",
  "cross-country",
  "obstacle",
  "track",
  "parkrun",
  "night-trail",
] as const;
export type TerrainTag = (typeof TERRAIN_TAG_VALUES)[number];

// Exact mapping from known England Athletics / Scottish Athletics discipline
// strings to terrain tags. Anything not in this map falls through to the
// free-text scan over `distances` + `name`.
const DISCIPLINE_TERRAIN_MAP: Record<string, TerrainTag[]> = {
  "road race": ["road"],
  road: ["road"],
  "multi-terrain race": ["multi-terrain"],
  "multi terrain race": ["multi-terrain"],
  "road race / multi terrain": ["road", "multi-terrain"],
  "road race / multi-terrain": ["road", "multi-terrain"],
  "trail race / ultra distance": ["trail"],
  "trail race": ["trail"],
  trail: ["trail"],
  "hill running": ["fell"],
  "hill race": ["fell"],
  fell: ["fell"],
  "fell race": ["fell"],
  "cross country": ["cross-country"],
  "cross-country": ["cross-country"],
  track: ["track"],
};

export interface ParseInput {
  name?: string | null;
  distances?: string | null;
  discipline?: string | null;
}

export interface ParseResult {
  distance_tags: DistanceTag[];
  terrain_tags: TerrainTag[];
}

export function parseEventTags(input: ParseInput): ParseResult {
  const distanceTags = new Set<DistanceTag>();
  const terrainTags = new Set<TerrainTag>();

  // ----- terrain -----
  const disc = input.discipline?.trim().toLowerCase() ?? "";
  if (disc) {
    const mapped = DISCIPLINE_TERRAIN_MAP[disc];
    if (mapped) for (const t of mapped) terrainTags.add(t);
  }

  const hay = [input.distances, input.name]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();

  if (hay) {
    if (/\bnight[\s-]?trail\b/.test(hay)) terrainTags.add("night-trail");
    if (/\btrail\b/.test(hay)) terrainTags.add("trail");
    if (/\bfell\b/.test(hay)) terrainTags.add("fell");
    if (/\bhill\s*race\b/.test(hay)) terrainTags.add("fell");
    if (
      /\bmulti[\s-]?terrain\b/.test(hay) ||
      /\bmixed[\s-]?terrain\b/.test(hay)
    )
      terrainTags.add("multi-terrain");
    if (/\bcross[\s-]?country\b/.test(hay)) terrainTags.add("cross-country");
    if (/\bobstacle\b/.test(hay)) terrainTags.add("obstacle");
    if (/\bparkrun\b/.test(hay)) terrainTags.add("parkrun");
    if (/\btrack\b/.test(hay) && !/\btrail\b/.test(hay))
      terrainTags.add("track");
    if (/\broad\b/.test(hay)) terrainTags.add("road");
  }

  // ----- distance -----
  if (hay) {
    // half marathon must run before generic "marathon"
    if (/\bhalf[\s-]?marathon\b/.test(hay)) distanceTags.add("half-marathon");

    // marathon, excluding "half marathon" and "ultra marathon"
    if (
      /(?:^|[^a-z-])(?<!half[\s-])marathon\b/.test(hay) &&
      !/\bultra[\s-]?marathon\b/.test(hay) &&
      !/\bhalf[\s-]?marathon\b/.test(
        hay.slice(
          Math.max(0, hay.search(/\bmarathon\b/) - 8),
          hay.search(/\bmarathon\b/) + 8,
        ),
      )
    ) {
      // fallback simple check: if "marathon" appears NOT preceded by "half " or "half-"
      const idx = hay.search(/\bmarathon\b/);
      const before = idx >= 0 ? hay.slice(Math.max(0, idx - 6), idx) : "";
      if (!/half[\s-]?$/.test(before)) distanceTags.add("marathon");
    }

    if (/\bultra\b/.test(hay)) distanceTags.add("ultra");

    // kilometre values: "5k", "5 km", "10 kilometres", "30K"
    const kmRe = /\b(\d{1,3}(?:\.\d+)?)\s*(?:k|km|kilometres?|kilometers?)\b/g;
    let m: RegExpExecArray | null;
    while ((m = kmRe.exec(hay)) !== null) {
      const n = Number(m[1]);
      const tag = kmToTag(n);
      if (tag) distanceTags.add(tag);
      if (n >= 43) distanceTags.add("ultra");
    }

    // mile values: "5 miles", "10 mile", "13.1 mi"
    const miRe = /\b(\d{1,3}(?:\.\d+)?)\s*(?:mi|mile|miles)\b/g;
    while ((m = miRe.exec(hay)) !== null) {
      const n = Number(m[1]);
      const tag = milesToTag(n);
      if (tag) distanceTags.add(tag);
      if (n >= 27) distanceTags.add("ultra");
      if (Math.abs(n - 13.1) < 0.2) distanceTags.add("half-marathon");
      if (Math.abs(n - 26.2) < 0.3) distanceTags.add("marathon");
    }

    if (/\bfun\s*run\b/.test(hay)) distanceTags.add("fun-run");
    if (/\bvarious\b/.test(hay) || /\bmulti[\s-]?distance\b/.test(hay))
      distanceTags.add("various");
  }

  return {
    distance_tags: Array.from(distanceTags),
    terrain_tags: Array.from(terrainTags),
  };
}

function kmToTag(n: number): DistanceTag | null {
  if (n === 5) return "5k";
  if (n === 10) return "10k";
  if (n === 15) return "15k";
  if (n === 20) return "20k";
  if (n === 21 || n === 21.1) return "half-marathon";
  if (n === 30) return "30k";
  if (n === 42 || n === 42.2) return "marathon";
  if (n === 50) return "50k";
  if (n === 100) return "100k";
  return null;
}

function milesToTag(n: number): DistanceTag | null {
  if (n === 1) return "1-mile";
  if (n === 5) return "5-mile";
  if (n === 10) return "10-mile";
  if (n === 20) return "20-mile";
  return null;
}

// ----- Distance-page → tag query mapping -----
//
// Used by the public distance pages (5K, 10K, Half, Marathon, Trail, Ultra)
// to filter the events table by tag arrays instead of substring-matching the
// free-text `distances` column.

export interface TagQuery {
  /** Match if event.distance_tags overlaps any of these. */
  distance?: DistanceTag[];
  /** Match if event.terrain_tags overlaps any of these. */
  terrain?: TerrainTag[];
}

export function distanceKeyToTagQuery(key: DistanceKey): TagQuery {
  switch (key) {
    case "5k":
      return { distance: ["5k"] };
    case "10k":
      return { distance: ["10k"] };
    case "half-marathon":
      return { distance: ["half-marathon"] };
    case "marathon":
      return { distance: ["marathon"] };
    case "ultra":
      return { distance: ["ultra"] };
    case "trail":
      // Trail page intentionally also catches multi-terrain and fell — those
      // are off-road categories runners expect to see on a "trail" search.
      return { terrain: ["trail", "multi-terrain", "fell"] };
  }
}

/**
 * In-memory check: does an event row (with parsed tag arrays) match a given
 * distance page? Used for the regional "other distances" panel where we
 * already have a full list of region events in memory.
 */
export function eventMatchesDistanceKey(
  row: {
    distance_tags: string[] | null | undefined;
    terrain_tags: string[] | null | undefined;
  },
  key: DistanceKey,
): boolean {
  const q = distanceKeyToTagQuery(key);
  const dt = row.distance_tags ?? [];
  const tt = row.terrain_tags ?? [];
  if (q.distance && q.distance.some((t) => dt.includes(t))) return true;
  if (q.terrain && q.terrain.some((t) => tt.includes(t))) return true;
  return false;
}

/**
 * Derive a single "primary" distance key for an event from its parsed tags.
 * Used for the "More {distance} races" link on event detail pages.
 */
export function primaryDistanceKeyFromTags(
  distance_tags: string[] | null | undefined,
  terrain_tags: string[] | null | undefined,
): DistanceKey | null {
  const dt = distance_tags ?? [];
  const tt = terrain_tags ?? [];
  if (dt.includes("ultra")) return "ultra";
  if (dt.includes("half-marathon")) return "half-marathon";
  if (dt.includes("marathon")) return "marathon";
  if (
    tt.includes("trail") ||
    tt.includes("multi-terrain") ||
    tt.includes("fell")
  )
    return "trail";
  if (dt.includes("10k")) return "10k";
  if (dt.includes("5k")) return "5k";
  return null;
}
