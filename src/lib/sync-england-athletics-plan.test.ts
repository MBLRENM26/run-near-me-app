import { describe, expect, it } from "vitest";
import {
  planEnglandAthleticsBatch,
  type EaEvent,
  type ExistingEaRow,
} from "./sync-england-athletics-plan";

function event(overrides: Partial<EaEvent> = {}): EaEvent {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "event",
    status: "ACTIVE",
    licensed: true,
    name: "Example 10K",
    start: "2026-09-10T09:00:00",
    end: "2026-09-10T12:00:00",
    registration_url: "https://entry.example/race",
    website_url: "https://organiser.example/race",
    races: [{ name: "10K", distance: "10K", event_race_distance: null }],
    address: {
      city: "MANCHESTER",
      region: "Greater Manchester",
      postcode: "M1",
      country: "England",
      latitude: 53.48,
      longitude: -2.24,
    },
    discipline: { name: "Road" },
    ...overrides,
  };
}

const TODAY = "2026-08-08";

describe("planEnglandAthleticsBatch", () => {
  it("uses the EA UUID as stable identity and preserves an existing slug", () => {
    const source = event({ name: "Renamed Example 10K" });
    const normId = `ea-${source.id}`;
    const existing: ExistingEaRow[] = [
      {
        slug: "original-public-slug",
        name: "Example 10K",
        date_from: "2026-09-10",
        norm_id: normId,
        source: "england-athletics",
      },
    ];
    const plan = planEnglandAthleticsBatch({
      events: [source],
      existingRows: existing,
      todayISO: TODAY,
    });
    expect(plan.rows[0]).toMatchObject({ norm_id: normId, slug: "original-public-slug" });
    expect(plan.updatedExisting).toBe(1);
    expect(plan.newEvents).toBe(0);
  });

  it("is idempotent across repeated identical input", () => {
    const source = event();
    const first = planEnglandAthleticsBatch({
      events: [source],
      existingRows: [],
      todayISO: TODAY,
    });
    const existing: ExistingEaRow[] = first.rows.map((row) => ({
      slug: row.slug ?? null,
      name: row.name ?? null,
      date_from: row.date_from ?? null,
      norm_id: row.norm_id ?? null,
      source: row.source ?? null,
    }));
    const second = planEnglandAthleticsBatch({
      events: [source],
      existingRows: existing,
      todayISO: TODAY,
    });
    expect(second.rows[0].norm_id).toBe(first.rows[0].norm_id);
    expect(second.rows[0].slug).toBe(first.rows[0].slug);
    expect(second.updatedExisting).toBe(1);
    expect(second.newEvents).toBe(0);
  });

  it("drops repeated IDs within one feed batch", () => {
    const source = event();
    const plan = planEnglandAthleticsBatch({
      events: [source, source],
      existingRows: [],
      todayISO: TODAY,
    });
    expect(plan.rows).toHaveLength(1);
    expect(plan.duplicateFeedIdsDropped).toBe(1);
  });

  it("does not create a new row over another source's exact name and date", () => {
    const existing: ExistingEaRow[] = [
      {
        slug: "other-source-race",
        name: "Example 10K",
        date_from: "2026-09-10",
        norm_id: "other-1",
        source: "scottishathletics",
      },
    ];
    const plan = planEnglandAthleticsBatch({
      events: [event()],
      existingRows: existing,
      todayISO: TODAY,
    });
    expect(plan.rows).toHaveLength(0);
    expect(plan.skippedDupes).toBe(1);
  });
});
