import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type Patch = {
  id: string;
  slug: string;
  evidence_url: string;
  expected: Record<string, unknown>;
  target: Record<string, unknown>;
};

const migrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260813201539_renm_soft404_residual.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");
const payloadMatch = migration.match(/\$patches\$\s*([\s\S]*?)\s*\$patches\$::jsonb/);
if (!payloadMatch) throw new Error("soft-404 migration patch payload not found");
const patches = JSON.parse(payloadMatch[1]) as Patch[];

const ALLOWED_FIELDS = new Set([
  "name",
  "date_raw",
  "date_from",
  "date_to",
  "sort_date",
  "town",
  "county",
  "region",
  "country",
  "distances",
  "distance_tags",
  "terrain_tags",
  "entry_fee",
  "organiser",
  "entry_url",
  "organiser_url",
  "licensed",
  "status",
  "duplicate_of",
  "series_key",
  "governance",
  "organiser_type",
  "race_profile",
  "is_upcoming",
  "is_curated_tags",
]);

describe("RENM soft-404 residual data package", () => {
  it("contains 46 unique stable-ID patches", () => {
    expect(patches).toHaveLength(46);
    expect(new Set(patches.map((patch) => patch.id)).size).toBe(46);
    expect(new Set(patches.map((patch) => patch.slug)).size).toBe(46);
    for (const patch of patches) {
      expect(patch.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(patch.evidence_url).toMatch(/^https?:\/\//);
      expect(Object.keys(patch.expected).length).toBeGreaterThan(0);
      expect(Object.keys(patch.target).length).toBeGreaterThan(0);
      expect(patch.target).not.toEqual(patch.expected);
    }
  });

  it("only writes existing, approved occurrence fields", () => {
    for (const patch of patches) {
      for (const field of Object.keys(patch.target)) {
        expect(ALLOWED_FIELDS.has(field), `${patch.slug}: ${field}`).toBe(true);
      }
    }
  });

  it("protects every reviewed taxonomy change from later sync overwrite", () => {
    const taxonomyPatches = patches.filter(
      (patch) => "distance_tags" in patch.target || "terrain_tags" in patch.target,
    );
    expect(taxonomyPatches).toHaveLength(25);
    expect(migration).toContain(
      "patch.target := patch.target || jsonb_build_object('is_curated_tags', true)",
    );
    expect(migration).toContain(
      "patch.expected := patch.expected || jsonb_build_object('is_curated_tags', false)",
    );
  });

  it("leaves the two unconfirmed occurrences unchanged", () => {
    const slugs = patches.map((patch) => patch.slug);
    expect(slugs).not.toContain("run-exe-summer-5k-september");
    expect(slugs).not.toContain("power-of-5k-race-1");
    expect(slugs).not.toContain("power-of-5k-race-1-2026-09-04");
  });

  it("retires Athens and merges Dartmoor onto one canonical occurrence", () => {
    const athens = patches.find((patch) => patch.slug === "athens-authentic-marathon-2");
    expect(athens?.expected).toMatchObject({
      status: "ACTIVE",
      country: "England",
      county: "International",
      region: "West Midlands",
    });
    expect(athens?.target).toMatchObject({ status: "HIDDEN", country: "Greece" });

    const survivorId = "92a0b167-d208-4721-8c9f-b00a7b522f9c";
    expect(
      patches.find((patch) => patch.slug === "dartmoor-way-100-full-circle")?.target,
    ).toMatchObject({
      name: "Dartmoor Way Full Circle 100 & Granite 50",
      date_from: "2026-10-02",
      date_to: "2026-10-03",
      distances: "51 Miles, 106 Miles",
    });
    expect(patches.find((patch) => patch.slug === "dartmoor-way-granite-50")?.target).toEqual({
      status: "DUPLICATE",
      duplicate_of: survivorId,
    });
    expect(
      patches.find((patch) => patch.slug === "dartmoor-way-granite-50-dartmoor-2026")?.target,
    ).toEqual({ duplicate_of: survivorId });
  });

  it("keeps the verified Scottish alias mapping and enriches its canonical", () => {
    expect(patches.some((patch) => patch.slug === "scottish-half-marathon-north-listing")).toBe(
      false,
    );
    expect(patches.find((patch) => patch.slug === "scottish-half-marathon")?.target).toEqual({
      series_key: "scottish-half-marathon-10k-2026",
    });
  });

  it("contains forward drift guards, audit writes, and rollback drift guards", () => {
    expect(migration).toContain("current_row @> patch.target");
    expect(migration).toContain("current_row @> patch.expected");
    expect(migration).toContain("GET DIAGNOSTICS affected = ROW_COUNT");
    expect(migration).toContain("INSERT INTO public.event_edits");

    const rollback = readFileSync(
      fileURLToPath(
        new URL("../../docs/renm/RENM-soft-404-residual-rollback-2026-08-13.sql", import.meta.url),
      ),
      "utf8",
    );
    expect(rollback).toContain("current_row -> item.key IS DISTINCT FROM item.value -> 'to'");
    expect(rollback).toContain("changes ->> 'package' = 'renm-soft404-residual-2026-08-13'");
  });
});
