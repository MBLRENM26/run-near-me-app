export interface DuplicateRow {
  id: string;
  slug: string | null;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  region: string | null;
  town: string | null;
  distances: string | null;
  discipline: string | null;
  source: string | null;
  source_url: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  norm_id: string | null;
  date_is_estimated: boolean;
  distance_tags: string[];
  terrain_tags: string[];
  is_recurring: boolean;
}

export type DuplicateConfidence = "high" | "medium" | "low";
export type DuplicateKind = "duplicate" | "series" | "review";

export interface DuplicateCluster {
  key: string;
  rows: DuplicateRow[];
  confidence: DuplicateConfidence;
  reason: string;
  kind: DuplicateKind;
  survivorId: string | null;
  survivorReason: string;
}

export interface RectificationInventoryRow extends DuplicateRow {
  status: string;
  date_from: string | null;
  is_upcoming: boolean;
  duplicate_of: string | null;
  series_key: string | null;
}

export interface RectificationInventory {
  generatedForDate: string;
  total: number;
  active: number;
  futureActive: number;
  undated: number;
  estimated: number;
  duplicateLinked: number;
  recurring: number;
  seriesLinked: number;
  withNormId: number;
  destinations: {
    entry: number;
    organiser: number;
    source: number;
    any: number;
    none: number;
  };
  byStatus: Array<{ value: string; count: number }>;
  bySource: Array<{ value: string; count: number }>;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function monthOf(sortDate: string | null): string | null {
  return sortDate?.slice(0, 7) ?? null;
}

function normTown(town: string | null): string | null {
  const value = town
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bnewcastle upon tyne\b/g, "newcastle")
    .trim();
  return value || null;
}

function explicitYears(name: string): string[] {
  return name.match(/\b(?:19|20)\d{2}\b/g) ?? [];
}

function sourceKey(row: DuplicateRow): string | null {
  const source = row.source?.trim().toLowerCase();
  return source || null;
}

function componentMarkers(name: string): string[] {
  const value = name.toLowerCase();
  const markers = new Set<string>();
  if (/\b(junior|juniors|children|kids?)\b/.test(value)) markers.add("junior");
  for (const match of value.matchAll(/\b(?:race|round|fixture)\s*#?\s*(\d{1,2})\b/g)) {
    markers.add(`number:${match[1]}`);
  }
  for (const match of value.matchAll(/\(([^)]*)\)/g)) {
    const detail = match[1].replace(/[^a-z0-9]+/g, " ").trim();
    if (/\b(junior|juniors|children|kids?|wee|fun|5k|10k|half|marathon|race)\b/.test(detail)) {
      markers.add(`detail:${detail}`);
    }
  }
  return [...markers].sort();
}

function hasComponentConflict(rows: DuplicateRow[]): boolean {
  const markerSets = rows.map((row) => componentMarkers(row.name).join("|"));
  return new Set(markerSets).size > 1 && markerSets.some(Boolean);
}

function hasYearConflict(rows: DuplicateRow[]): boolean {
  const years = new Set(rows.flatMap((row) => explicitYears(row.name)));
  return years.size > 1;
}

function hasSourceConflict(rows: DuplicateRow[]): boolean {
  const sources = rows.map(sourceKey).filter((value): value is string => !!value);
  return sources.length !== rows.length || new Set(sources).size > 1;
}

function normaliseUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().replace(/\/$/, "").toLowerCase() || null;
  }
}

function hasDestinationConflict(rows: DuplicateRow[]): boolean {
  const destinations = rows
    .map((row) => normaliseUrl(row.entry_url))
    .filter((value): value is string => !!value);
  return new Set(destinations).size > 1;
}

function hasDistanceComponentConflict(rows: DuplicateRow[]): boolean {
  const tagSets = rows.map((row) => new Set(row.distance_tags)).filter((tags) => tags.size > 0);
  for (let i = 0; i < tagSets.length; i += 1) {
    for (let j = i + 1; j < tagSets.length; j += 1) {
      const left = tagSets[i];
      const right = tagSets[j];
      const leftSubset = [...left].every((tag) => right.has(tag));
      const rightSubset = [...right].every((tag) => left.has(tag));
      if (!leftSubset && !rightSubset) return true;
    }
  }
  return false;
}

function hasMixedDates(rows: DuplicateRow[]): boolean {
  const dates = rows.map((row) => row.sort_date).filter((value): value is string => !!value);
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);
  return counts.size > 1 && [...counts.values()].some((count) => count > 1);
}

export function normaliseEventName(name: string): string {
  return name
    .replace(/\s*[-–—:]?\s*\bcopy(?:\s+\d+)?\b\s*$/i, " ")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(spring|summer|autumn|fall|winter)\b/g, " ")
    .replace(/\b(the|a|an|race|run|running|event|events)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .sort()
    .join(" ");
}

function hasExplicitCopySuffix(name: string): boolean {
  return /\s*[-–—:]?\s*\bcopy(?:\s+\d+)?\b\s*$/i.test(name);
}

function scoreDuplicateCluster(rows: DuplicateRow[]): {
  confidence: DuplicateConfidence;
  reason: string;
} {
  const dates = rows.map((row) => row.sort_date);
  const months = rows.map((row) => monthOf(row.sort_date));
  const towns = rows.map((row) => normTown(row.town));
  const hosts = rows.map((row) => hostOf(row.source_url));
  const populatedDates = dates.filter((value): value is string => !!value);
  const populatedMonths = months.filter((value): value is string => !!value);
  const populatedTowns = towns.filter((value): value is string => !!value);
  const populatedHosts = hosts.filter((value): value is string => !!value);
  const allDatesEqual =
    populatedDates.length === rows.length &&
    populatedDates.length >= 2 &&
    populatedDates.every((value) => value === populatedDates[0]);
  const conflictingDates =
    populatedDates.length === rows.length && new Set(populatedDates).size > 1;
  const allMonthsEqual = populatedMonths.length >= 2 && new Set(populatedMonths).size === 1;
  const conflictingMonths =
    populatedMonths.length === rows.length && new Set(populatedMonths).size > 1;
  const allTownsEqual = populatedTowns.length >= 2 && new Set(populatedTowns).size === 1;
  const conflictingTowns =
    populatedTowns.length === rows.length && new Set(populatedTowns).size > 1;
  const sharedHost = populatedHosts.length >= 2 && new Set(populatedHosts).size === 1;
  const explicitCopy = rows.some((row) => hasExplicitCopySuffix(row.name));

  if (conflictingDates || conflictingTowns) {
    return {
      confidence: "low",
      reason: conflictingTowns
        ? "Towns differ — likely a name collision, not a duplicate."
        : "Dates differ — likely a recurring series.",
    };
  }
  if (allDatesEqual) {
    return {
      confidence: "high",
      reason: explicitCopy
        ? "Explicit COPY suffix and identical sort_date."
        : "Identical sort_date; review before correction.",
    };
  }
  if (allMonthsEqual && allTownsEqual) {
    return {
      confidence: "medium",
      reason: "Same month and town, but dates differ or are incomplete.",
    };
  }
  if (allMonthsEqual && sharedHost) {
    return {
      confidence: "medium",
      reason: "Same month and source host, but evidence is incomplete.",
    };
  }
  if (allMonthsEqual) {
    return { confidence: "medium", reason: "Same month, town unknown." };
  }
  if (conflictingMonths) {
    return { confidence: "low", reason: "Months differ — likely a recurring series." };
  }
  return { confidence: "medium", reason: "Some dates missing — review before correction." };
}

function detectSeries(rows: DuplicateRow[]): boolean {
  if (rows.length < 3) return false;
  const towns = rows.map((row) => normTown(row.town)).filter((value): value is string => !!value);
  if (towns.length > 0 && new Set(towns).size > 1) return false;
  const dates = rows.map((row) => row.sort_date).filter((value): value is string => !!value);
  if (dates.length !== rows.length || new Set(dates).size !== dates.length) return false;
  return new Set(dates).size >= 3 || new Set(dates.map((date) => date.slice(0, 7))).size >= 2;
}

function completenessScore(row: DuplicateRow): number {
  return (
    (row.sort_date ? 8 : 0) +
    (!row.date_is_estimated ? 4 : 0) +
    (row.slug ? 4 : 0) +
    (row.norm_id ? 3 : 0) +
    (row.entry_url ? 3 : 0) +
    (row.organiser_url ? 1 : 0) +
    (row.source_url ? 2 : 0) +
    (row.distances ? 4 : 0) +
    (row.discipline ? 1 : 0) +
    row.distance_tags.length +
    row.terrain_tags.length -
    (hasExplicitCopySuffix(row.name) ? 100 : 0)
  );
}

function survivorReason(row: DuplicateRow): string {
  const tags = row.distance_tags.length + row.terrain_tags.length;
  return `Same-source candidate: completeness ${completenessScore(row)} (${row.sort_date ? "dated" : "undated"}, ${row.date_is_estimated ? "estimated" : "confirmed"}, ${row.norm_id ? "source ID" : "no source ID"}, ${row.distances ? "raw distance" : "no raw distance"}, ${tags} tags); ID tie-break.`;
}

function seriesReason(rows: DuplicateRow[]): string {
  const sources = new Set(rows.map((row) => row.source).filter(Boolean));
  const dates = rows.map((row) => row.sort_date).filter((value): value is string => !!value);
  const months = new Set(dates.map((date) => date.slice(0, 7))).size;
  const sourceNote = sources.size === 1 ? ` from ${[...sources][0]}` : "";
  return `Recurring series — ${rows.length} dates across ${months} month${months === 1 ? "" : "s"}${sourceNote}.`;
}

export function buildDuplicateClusters(rows: DuplicateRow[]): DuplicateCluster[] {
  const groups = new Map<string, DuplicateRow[]>();
  for (const row of rows) {
    const norm = normaliseEventName(row.name);
    if (!norm) continue;
    const key = `${norm}::${row.region ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const clusters: DuplicateCluster[] = [];
  for (const [key, groupedRows] of groups) {
    if (groupedRows.length < 2) continue;
    const ordered = [...groupedRows].sort((a, b) => {
      const score = completenessScore(b) - completenessScore(a);
      return score || a.id.localeCompare(b.id);
    });
    let kind: DuplicateKind = "duplicate";
    let confidence: DuplicateConfidence;
    let reason: string;
    let survivorId: string | null = ordered[0].id;

    if (hasMixedDates(ordered)) {
      kind = "review";
      confidence = "low";
      reason =
        "Mixed cluster: a same-date duplicate sits inside a multi-date event family. Resolve the duplicate before series linking.";
      survivorId = null;
    } else if (hasYearConflict(ordered)) {
      kind = "review";
      confidence = "low";
      reason =
        "Names contain conflicting edition years. Verify the authoritative date before any correction.";
      survivorId = null;
    } else if (hasComponentConflict(ordered)) {
      kind = "review";
      confidence = "low";
      reason =
        "Names indicate different race numbers or junior/parent components. Treat as distinct until verified.";
      survivorId = null;
    } else if (hasSourceConflict(ordered)) {
      kind = "review";
      confidence = "medium";
      reason =
        "Source authority is missing or conflicting. Resolve provenance and destinations before selecting a survivor.";
      survivorId = null;
    } else if (hasDestinationConflict(ordered)) {
      kind = "review";
      confidence = "medium";
      reason =
        "Entry destinations conflict. Verify which destination represents the canonical occurrence before selecting a survivor.";
      survivorId = null;
    } else if (hasDistanceComponentConflict(ordered)) {
      kind = "review";
      confidence = "medium";
      reason =
        "Distance components conflict. Verify whether these rows represent the same occurrence before correction.";
      survivorId = null;
    } else if (detectSeries(ordered)) {
      kind = "series";
      confidence = "low";
      reason = seriesReason(ordered);
      survivorId = null;
    } else {
      const scored = scoreDuplicateCluster(ordered);
      confidence = scored.confidence;
      reason = scored.reason;
      if (confidence !== "high") {
        kind = "review";
        survivorId = null;
      }
    }
    clusters.push({
      key,
      rows: ordered,
      confidence,
      reason,
      kind,
      survivorId,
      survivorReason: survivorId
        ? survivorReason(ordered.find((row) => row.id === survivorId)!)
        : "No survivor selected: manual evidence review required.",
    });
  }

  const tierRank: Record<DuplicateConfidence, number> = { high: 0, medium: 1, low: 2 };
  return clusters.sort((a, b) => {
    const kindRank: Record<DuplicateKind, number> = { series: 0, duplicate: 1, review: 2 };
    return (
      kindRank[a.kind] - kindRank[b.kind] ||
      tierRank[a.confidence] - tierRank[b.confidence] ||
      b.rows.length - a.rows.length ||
      a.key.localeCompare(b.key)
    );
  });
}

function sortedCounts(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function buildRectificationInventory(
  rows: RectificationInventoryRow[],
  todayISO: string,
): RectificationInventory {
  const activeRows = rows.filter((row) => row.status === "ACTIVE");
  const anyDestination = (row: RectificationInventoryRow) =>
    !!(row.entry_url || row.organiser_url || row.source_url);
  return {
    generatedForDate: todayISO,
    total: rows.length,
    active: activeRows.length,
    futureActive: activeRows.filter((row) => !!row.sort_date && row.sort_date >= todayISO).length,
    undated: rows.filter((row) => !row.sort_date && !row.date_from).length,
    estimated: rows.filter((row) => row.date_is_estimated).length,
    duplicateLinked: rows.filter((row) => !!row.duplicate_of).length,
    recurring: rows.filter((row) => row.is_recurring).length,
    seriesLinked: rows.filter((row) => !!row.series_key).length,
    withNormId: rows.filter((row) => !!row.norm_id).length,
    destinations: {
      entry: rows.filter((row) => !!row.entry_url).length,
      organiser: rows.filter((row) => !!row.organiser_url).length,
      source: rows.filter((row) => !!row.source_url).length,
      any: rows.filter(anyDestination).length,
      none: rows.filter((row) => !anyDestination(row)).length,
    },
    byStatus: sortedCounts(rows.map((row) => row.status || "UNKNOWN")),
    bySource: sortedCounts(rows.map((row) => row.source?.trim() || "UNKNOWN")),
  };
}
