import { describe, expect, it } from "vitest";
import {
  buildDuplicateClusters,
  buildRectificationInventory,
  normaliseEventName,
  type DuplicateRow,
  type RectificationInventoryRow,
} from "./event-rectification";

function row(overrides: Partial<DuplicateRow> & Pick<DuplicateRow, "id" | "name">): DuplicateRow {
  return {
    slug: overrides.id,
    date_raw: null,
    sort_date: "2026-08-09",
    region: "Scotland",
    town: "Banff",
    distances: "10K",
    discipline: "Road",
    source: "england-athletics",
    source_url: "https://example.com/race",
    entry_url: "https://entry.example.com/race",
    organiser_url: "https://organiser.example.com/race",
    norm_id: `ea-${overrides.id}`,
    date_is_estimated: false,
    distance_tags: ["10k"],
    terrain_tags: ["road"],
    is_recurring: false,
    ...overrides,
  };
}

describe("event rectification", () => {
  it("normalises an explicit COPY suffix without weakening the full name", () => {
    expect(normaliseEventName("Deveron Valley Half marathon, 10k and 5k - COPY")).toBe(
      normaliseEventName("Deveron Valley Half marathon, 10k and 5k"),
    );
    expect(normaliseEventName("Copycat 10K")).not.toBe(normaliseEventName("Cat 10K"));
  });

  it("reports COPY pairs as candidates with deterministic IDs and no mutation", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "b", name: "Deveron Valley Half marathon, 10k and 5k - COPY", distance_tags: [] }),
      row({ id: "a", name: "Deveron Valley Half marathon, 10k and 5k" }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].confidence).toBe("high");
    expect(clusters[0].kind).toBe("duplicate");
    expect(clusters[0].survivorId).toBe("a");
    expect(clusters[0].reason).toContain("COPY suffix");
    expect(clusters[0].rows.map((candidate) => candidate.id)).toEqual(["a", "b"]);
    expect(clusters[0].survivorReason).toContain("Same-source candidate");
  });

  it("keeps conflicting-date fixtures out of high confidence", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Tatton 10K", sort_date: "2026-08-08" }),
      row({ id: "b", name: "Tatton 10K", sort_date: "2026-08-22" }),
    ]);
    expect(clusters[0].confidence).toBe("low");
    expect(clusters[0].kind).toBe("review");
    expect(clusters[0].survivorId).toBeNull();
  });

  it("holds conflicting edition years for manual review", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Saltfest 5K 2025", sort_date: "2026-09-06" }),
      row({ id: "b", name: "Saltfest 5K 2026", sort_date: "2026-09-06" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "low", survivorId: null });
    expect(clusters[0].reason).toContain("conflicting edition years");
  });

  it("keeps numbered race components distinct", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Power of 5K Race 1" }),
      row({ id: "b", name: "Power of 5K Race 2" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", survivorId: null });
    expect(clusters[0].reason).toContain("different race numbers");
  });

  it("does not treat an edition year after Race as a race number", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Wimborne 10 Mile Road Race" }),
      row({ id: "b", name: "Wimborne 10 Mile Road Race 2026" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "duplicate", confidence: "high" });
  });

  it("holds meaningful parenthetical components for review", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Loch Ness Marathon & Festival of Running 2026" }),
      row({
        id: "b",
        name: "Loch Ness Marathon & Festival of Running 2026 (10k Race and Wee Nessie)",
      }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "low", survivorId: null });
  });

  it("holds conflicting entry destinations for review", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Flying Fox 10", entry_url: "https://timing.example/flying-fox" }),
      row({ id: "b", name: "Flying Fox 10 2026", entry_url: "https://club.example/flying-fox" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "medium", survivorId: null });
    expect(clusters[0].reason).toContain("Entry destinations conflict");
  });

  it("holds incompatible distance components for review", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Tamworth 5 Mile", distance_tags: ["5-mile", "1-mile"] }),
      row({ id: "b", name: "Tamworth 5 Mile 2026", distance_tags: ["5-mile", "fun-run"] }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "medium", survivorId: null });
    expect(clusters[0].reason).toContain("Distance components conflict");
  });

  it("does not select a survivor across sources", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Telford 10K", source: "runabc" }),
      row({ id: "b", name: "Telford 10K 2026", source: "england-athletics" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "medium", survivorId: null });
    expect(clusters[0].reason).toContain("Source authority");
  });

  it("holds a same-date duplicate inside a multi-date family", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Fast & Furious 5KM", sort_date: "2026-07-17" }),
      row({ id: "b", name: "Fast & Furious 5KM", sort_date: "2026-08-21" }),
      row({ id: "c", name: "Fast & Furious 5KM", sort_date: "2026-08-21" }),
      row({ id: "d", name: "Fast & Furious 5KM", sort_date: "2026-09-18" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "review", confidence: "low", survivorId: null });
    expect(clusters[0].reason).toContain("same-date duplicate");
  });

  it("surfaces a clean multi-date family as a series", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Northern AC Winter Road Series", sort_date: "2026-10-13" }),
      row({ id: "b", name: "Northern AC Winter Road Series", sort_date: "2026-11-03" }),
      row({ id: "c", name: "Northern AC Winter Road Series", sort_date: "2026-12-01" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "series", survivorId: null });
  });

  it("normalises the common Newcastle place alias", () => {
    const clusters = buildDuplicateClusters([
      row({ id: "a", name: "Town Moor 10K", town: "Newcastle" }),
      row({ id: "b", name: "Town Moor 10K 2026", town: "Newcastle upon Tyne" }),
    ]);
    expect(clusters[0]).toMatchObject({ kind: "duplicate", confidence: "high" });
  });

  it("builds stable existing-schema counts", () => {
    const inventoryRows: RectificationInventoryRow[] = [
      {
        ...row({ id: "a", name: "Future" }),
        status: "ACTIVE",
        date_from: "2026-08-09",
        date_is_estimated: false,
        is_upcoming: true,
        norm_id: "ea-a",
        duplicate_of: null,
        series_key: null,
        entry_url: "https://entry.example/a",
        organiser_url: null,
      },
      {
        ...row({ id: "b", name: "Undated", sort_date: null, source: null }),
        status: "DUPLICATE",
        date_from: null,
        date_is_estimated: true,
        is_upcoming: false,
        norm_id: null,
        duplicate_of: "a",
        series_key: "series-a",
        entry_url: null,
        organiser_url: null,
        source_url: null,
      },
    ];
    const inventory = buildRectificationInventory(inventoryRows, "2026-08-08");
    expect(inventory).toMatchObject({
      total: 2,
      active: 1,
      futureActive: 1,
      undated: 1,
      estimated: 1,
      duplicateLinked: 1,
      seriesLinked: 1,
      withNormId: 1,
      destinations: { any: 1, none: 1 },
    });
    expect(inventory.bySource).toEqual([
      { value: "england-athletics", count: 1 },
      { value: "UNKNOWN", count: 1 },
    ]);
  });
});
