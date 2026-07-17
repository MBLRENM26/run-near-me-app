import { describe, it, expect } from "vitest";
import {
  planScottishAthleticsBatch,
  parseJustGoRef,
  type JustGoEvent,
  type ExistingSaRow,
} from "./sync-scottish-athletics-plan";

const REF_A = "132E00000000000000000000000000000000BF18";
const REF_B = "3CD400000000000000000000000000000000877A";
const REF_C = "AAAA00000000000000000000000000000000AAAA";
const REF_SHARED = "0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A00001517";
const REF_NEW_1 = "11110000000000000000000000000000FFFFFFFF";
const REF_NEW_2 = "22220000000000000000000000000000FFFFFFFF";

function mkEvent(overrides: Partial<JustGoEvent> & {
  name: string;
  date: string; // YYYY-MM-DD
  ref?: string | null;
}): JustGoEvent {
  const [y, m, d] = overrides.date.split("-").map(Number);
  const directlink =
    overrides.ref === null
      ? ""
      : `https://scottishathletics.justgo.com/booking?ref=${overrides.ref ?? REF_A}`;
  return {
    DocId: 1,
    EventName: overrides.name,
    EventCategory: "Road Race / Multi Terrain",
    Directlink: directlink,
    Address: { Town: "Test", County: "Fife", Postcode: null, Country: "Scotland" },
    Latlng: { Lat: "56.0", Lng: "-3.0" },
    EntityInfo: { Name: "Test Club" },
    Starts: { Date: `Date(${y},${m - 1},${d})` },
    Ends: { Date: `Date(${y},${m - 1},${d})` },
    PriceSettings: { DisplayPrice: null },
    ...overrides,
  };
}

const TODAY = "2026-01-01";

describe("parseJustGoRef", () => {
  it("extracts 40-char hex ref, uppercased", () => {
    expect(parseJustGoRef(`https://x?ref=${REF_A.toLowerCase()}`)).toBe(REF_A);
  });
  it("returns null for malformed", () => {
    expect(parseJustGoRef(null)).toBeNull();
    expect(parseJustGoRef("https://x?ref=short")).toBeNull();
    expect(parseJustGoRef("")).toBeNull();
  });
});

describe("planScottishAthleticsBatch", () => {
  it("preserves both records in a genuinely distinct collision pair (order independent)", () => {
    const existing: ExistingSaRow[] = [
      {
        slug: "whitetops-hill-race",
        name: "Whitetops Hill Race",
        date_from: "2026-06-26",
        norm_id: "scottishathletics-whitetops-hill-race",
        source: "scottishathletics",
        source_url: `https://x?ref=${REF_A}`,
      },
      {
        slug: "whitetops-hill-race-2026-06-26",
        name: "Whitetops Hill Race",
        date_from: "2026-06-26",
        norm_id: "scottishathletics-whitetops-hill-race-2026-06-26",
        source: "scottishathletics",
        source_url: `https://x?ref=${REF_B}`,
      },
    ];
    const globalSlugOwners = new Map<string, string | null>([
      ["whitetops-hill-race", "scottishathletics-whitetops-hill-race"],
      ["whitetops-hill-race-2026-06-26", "scottishathletics-whitetops-hill-race-2026-06-26"],
    ]);
    const a = mkEvent({ name: "Whitetops Hill Race", date: "2026-06-26", ref: REF_A });
    const b = mkEvent({ name: "Whitetops Hill Race", date: "2026-06-26", ref: REF_B });

    const p1 = planScottishAthleticsBatch({
      records: [a, b], existingRows: existing, globalSlugOwners, todayISO: TODAY,
    });
    const p2 = planScottishAthleticsBatch({
      records: [b, a], existingRows: existing, globalSlugOwners, todayISO: TODAY,
    });

    const slugs1 = p1.rows.map((r) => r.slug).sort();
    const slugs2 = p2.rows.map((r) => r.slug).sort();
    expect(slugs1).toEqual(["whitetops-hill-race", "whitetops-hill-race-2026-06-26"]);
    expect(slugs1).toEqual(slugs2);
    expect(p1.stats.updatedExisting).toBe(2);
    expect(p1.stats.newEvents).toBe(0);
  });

  it("handles brand-new collision-group member with ref-derived slug", () => {
    const existing: ExistingSaRow[] = [
      {
        slug: "whitetops-hill-race", name: "Whitetops Hill Race", date_from: "2026-06-26",
        norm_id: "scottishathletics-whitetops-hill-race",
        source: "scottishathletics", source_url: `https://x?ref=${REF_A}`,
      },
      {
        slug: "whitetops-hill-race-2026-06-26", name: "Whitetops Hill Race", date_from: "2026-06-26",
        norm_id: "scottishathletics-whitetops-hill-race-2026-06-26",
        source: "scottishathletics", source_url: `https://x?ref=${REF_B}`,
      },
    ];
    const p = planScottishAthleticsBatch({
      records: [
        mkEvent({ name: "Whitetops Hill Race", date: "2026-06-26", ref: REF_A }),
        mkEvent({ name: "Whitetops Hill Race", date: "2026-06-26", ref: REF_B }),
        mkEvent({ name: "Whitetops Hill Race", date: "2026-06-26", ref: REF_C }),
      ],
      existingRows: existing,
      globalSlugOwners: new Map(),
      todayISO: TODAY,
    });
    const slugs = p.rows.map((r) => r.slug).sort();
    expect(slugs).toContain("whitetops-hill-race");
    expect(slugs).toContain("whitetops-hill-race-2026-06-26");
    expect(slugs).toContain(`whitetops-hill-race-r${REF_C.slice(0, 8).toLowerCase()}`);
    expect(p.stats.newEvents).toBe(1);
    expect(p.stats.updatedExisting).toBe(2);
  });

  it("fails loudly when a collision group has a member with no parseable ref", () => {
    expect(() =>
      planScottishAthleticsBatch({
        records: [
          mkEvent({ name: "Foo 5k", date: "2026-05-01", ref: REF_A }),
          mkEvent({ name: "Foo 5k", date: "2026-05-01", ref: null }),
        ],
        existingRows: [],
        globalSlugOwners: new Map(),
        todayISO: TODAY,
      }),
    ).toThrow(/no parseable JustGo ref/);
  });

  it("skips records whose ref maps to a shared-legacy pair (2+ existing rows)", () => {
    const existing: ExistingSaRow[] = [
      {
        slug: "3k-on-the-green", name: "3k on the Green", date_from: "2026-08-28",
        norm_id: "scottishathletics-3k-on-the-green",
        source: "scottishathletics", source_url: `https://x?ref=${REF_SHARED}`,
      },
      {
        slug: "3k-on-the-green-2026-08-28", name: "3k on the Green", date_from: "2026-08-28",
        norm_id: "scottishathletics-3k-on-the-green-2026-08-28",
        source: "scottishathletics", source_url: `https://x?ref=${REF_SHARED}`,
      },
    ];
    const p = planScottishAthleticsBatch({
      records: [mkEvent({ name: "3k on the Green", date: "2026-08-28", ref: REF_SHARED })],
      existingRows: existing,
      globalSlugOwners: new Map(),
      todayISO: TODAY,
    });
    expect(p.rows).toHaveLength(0);
    expect(p.stats.sharedRefSkipped).toBe(1);
    expect(p.warnings.some((w) => w.includes(REF_SHARED))).toBe(true);
  });

  it("dedupes exact-ref duplicates in the incoming feed", () => {
    const e = mkEvent({ name: "Some Race", date: "2026-07-04", ref: REF_NEW_1 });
    const p = planScottishAthleticsBatch({
      records: [e, e, e],
      existingRows: [],
      globalSlugOwners: new Map(),
      todayISO: TODAY,
    });
    expect(p.rows).toHaveLength(1);
    expect(p.stats.duplicateRefsDropped).toBe(2);
  });

  it("two consecutive clean runs produce identical output", () => {
    const records = [
      mkEvent({ name: "Race A", date: "2026-09-05", ref: REF_NEW_1 }),
      mkEvent({ name: "Race B", date: "2026-09-05", ref: REF_NEW_2 }),
    ];
    const p1 = planScottishAthleticsBatch({
      records, existingRows: [], globalSlugOwners: new Map(), todayISO: TODAY,
    });
    // Simulate second run: rows from p1 are now the existing state.
    const existing: ExistingSaRow[] = p1.rows.map((r) => ({
      slug: r.slug!, name: r.name!, date_from: r.date_from!,
      norm_id: r.norm_id!, source: "scottishathletics", source_url: r.source_url ?? null,
    }));
    const p2 = planScottishAthleticsBatch({
      records, existingRows: existing, globalSlugOwners: new Map(), todayISO: TODAY,
    });
    expect(p2.rows.map((r) => r.slug).sort()).toEqual(p1.rows.map((r) => r.slug).sort());
    expect(p2.rows.map((r) => r.norm_id).sort()).toEqual(p1.rows.map((r) => r.norm_id).sort());
    expect(p2.stats.newEvents).toBe(0);
    expect(p2.stats.updatedExisting).toBe(2);
  });

  it("skips records that collide by name+date with another source", () => {
    const existing: ExistingSaRow[] = [
      {
        slug: "ea-owned", name: "Shared Race", date_from: "2026-10-10",
        norm_id: "ea-shared-race", source: "englandathletics",
        source_url: null,
      },
    ];
    const p = planScottishAthleticsBatch({
      records: [mkEvent({ name: "Shared Race", date: "2026-10-10", ref: REF_NEW_1 })],
      existingRows: existing,
      globalSlugOwners: new Map(),
      todayISO: TODAY,
    });
    expect(p.rows).toHaveLength(0);
    expect(p.stats.skippedDupes).toBe(1);
  });

  it("skips records with unparseable date", () => {
    const bad: JustGoEvent = mkEvent({ name: "No Date", date: "2026-05-01", ref: REF_NEW_1 });
    bad.Starts = { Date: null };
    const p = planScottishAthleticsBatch({
      records: [bad], existingRows: [], globalSlugOwners: new Map(), todayISO: TODAY,
    });
    expect(p.rows).toHaveLength(0);
    expect(p.stats.skippedNoDate).toBe(1);
  });
});
