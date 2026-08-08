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
  distance_tags: string[];
  terrain_tags: string[];
  is_recurring: boolean;
}

export type DuplicateConfidence = "high" | "medium" | "low";
export type DuplicateKind = "duplicate" | "series";

export interface DuplicateCluster {
  key: string;
  rows: DuplicateRow[];
  confidence: DuplicateConfidence;
  reason: string;
  kind: DuplicateKind;
  survivorReason: string;
}

export interface RectificationInventoryRow extends DuplicateRow {
  status: string;
  date_from: string | null;
  date_is_estimated: boolean;
  is_upcoming: boolean;
  norm_id: string | null;
  duplicate_of: string | null;
  series_key: string | null;
  entry_url: string | null;
  organiser_url: string | null;
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
  const value = town?.trim().toLowerCase();
  return value || null;
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

function scoreCluster(rows: DuplicateRow[]): {
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
    populatedDates.length >= 2 && populatedDates.every((value) => value === populatedDates[0]);
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
    return { confidence: "high", reason: "Same month and town; review before correction." };
  }
  if (allMonthsEqual && sharedHost) {
    return { confidence: "high", reason: "Same month and source host; review before correction." };
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
  return new Set(dates).size >= 3 || new Set(dates.map((date) => date.slice(0, 7))).size >= 2;
}

function completenessScore(row: DuplicateRow): number {
  return (
    (row.sort_date ? 8 : 0) +
    (row.slug ? 4 : 0) +
    (row.source_url ? 2 : 0) +
    row.distance_tags.length +
    row.terrain_tags.length
  );
}

function survivorReason(row: DuplicateRow): string {
  const tags = row.distance_tags.length + row.terrain_tags.length;
  return `Deterministic candidate: completeness ${completenessScore(row)} (${row.sort_date ? "dated" : "undated"}, ${tags} tags); ID tie-break.`;
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
    const scored = scoreCluster(ordered);
    const kind = detectSeries(ordered) ? "series" : "duplicate";
    clusters.push({
      key,
      rows: ordered,
      confidence: scored.confidence,
      reason: kind === "series" ? seriesReason(ordered) : scored.reason,
      kind,
      survivorReason: survivorReason(ordered[0]),
    });
  }

  const tierRank: Record<DuplicateConfidence, number> = { high: 0, medium: 1, low: 2 };
  return clusters.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "series" ? -1 : 1;
    return (
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
