/**
 * Deterministic series identity for recurring (usually annual) races.
 *
 * Purpose: connect this year's occurrence of a race to last year's, so a race
 * that has happened can be *rediscovered* when its next edition is due, rather
 * than silently ageing out of the catalogue.
 *
 * Rules (deliberately conservative):
 *  - derived ONLY from stable stored fields: name, town, primary distance
 *  - pure and deterministic: no network, no clock, no database, no writes
 *  - edition markers (years, ordinals, "annual") are stripped so the same race
 *    yields the same key every year
 *  - returns null rather than guessing when the name is unusable
 *
 * This module never writes `events.series_key`. It only proposes a key so an
 * admin can review groupings before any audited data update happens.
 */

export type SeriesKeyInput = {
  name: string | null | undefined;
  town?: string | null;
  distance_tags?: string[] | null;
  distances?: string | null;
};

/** Words that only describe *which* edition this is, never the race identity. */
const EDITION_WORDS = new Set(["annual", "edition", "the"]);

/** Strip diacritics and lowercase. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normalise a race name to its series form.
 *
 * "The 42nd Annual Tettenhall 5K 2026" -> "tettenhall 5k"
 */
export function normaliseSeriesName(name: string | null | undefined): string {
  if (!name) return "";
  let s = fold(name);

  // Four-digit years and year spans: 2026, 2026/27, 2026-2027.
  s = s.replace(/\b(19|20)\d{2}\s*[/-]\s*(\d{2}|(19|20)\d{2})\b/g, " ");
  s = s.replace(/\b(19|20)\d{2}\b/g, " ");

  // Ordinal edition markers: 3rd, 42nd, 101st, 12th.
  s = s.replace(/\b\d{1,3}(st|nd|rd|th)\b/g, " ");

  // Anything that is not a letter or digit becomes a separator.
  s = s.replace(/[^a-z0-9]+/g, " ");

  const words = s
    .split(" ")
    .filter((w) => w.length > 0 && !EDITION_WORDS.has(w));

  return words.join(" ").trim();
}

/** Normalise a town/place token used to separate same-named races. */
export function normaliseTownToken(town: string | null | undefined): string {
  if (!town) return "";
  return fold(town)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// Order matters: more specific tokens first, so "half marathon" is not
// swallowed by "marathon".
const DISTANCE_TOKEN_ORDER = [
  "ultra",
  "half-marathon",
  "marathon",
  "half",
  "20m",
  "10m",
  "20k",
  "10k",
  "5m",
  "5k",
  "parkrun",
];

/**
 * Pick one stable distance token for the series key.
 *
 * Prefers curated `distance_tags`; falls back to sniffing the free-text
 * `distances` string. Returns "" when nothing reliable is present — a missing
 * distance must not invent a distinction between editions.
 */
export function primaryDistanceToken(
  distanceTags?: string[] | null,
  distances?: string | null,
): string {
  const tags = (distanceTags ?? [])
    .map((t) => fold(String(t)).replace(/[^a-z0-9]+/g, "-"))
    .filter(Boolean)
    .sort();
  if (tags.length > 0) return tags[0];

  if (!distances) return "";
  const s = fold(distances);
  for (const token of DISTANCE_TOKEN_ORDER) {
    const needle = token.replace(/-/g, " ");
    if (s.includes(needle)) return token;
  }
  return "";
}

/**
 * Build the proposed series key, or null when the name is unusable.
 *
 * Shape: `name-slug|town|distance` (empty segments retained so the key stays
 * positionally stable and parseable).
 */
export function buildSeriesKey(input: SeriesKeyInput): string | null {
  const name = normaliseSeriesName(input.name);
  if (name.length < 3) return null;

  const nameSlug = name.replace(/\s+/g, "-");
  const town = normaliseTownToken(input.town);
  const distance = primaryDistanceToken(input.distance_tags, input.distances);

  return `${nameSlug}|${town}|${distance}`;
}

/** Human-readable label for a series key, for admin display only. */
export function describeSeriesKey(key: string): string {
  const [name, town, distance] = key.split("|");
  const parts = [name?.replace(/-/g, " ") ?? key];
  if (town) parts.push(town.replace(/-/g, " "));
  if (distance) parts.push(distance.replace(/-/g, " "));
  return parts.join(" · ");
}
