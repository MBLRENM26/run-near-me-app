import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DISCOVERY_EVENT_COLUMNS } from "@/lib/events-query";

/**
 * L3B-2 regression: the homepage curated "upcoming" (quality-v1) query must read
 * from the accepted public projection `events_public_v1`, never the `events`
 * base table, and must not re-apply the redundant status predicate. The nearby
 * radius RPC and live count behaviour are unchanged by this package.
 */
const source = readFileSync(
  new URL("../routes/index.tsx", import.meta.url),
  "utf8",
);

const ACCEPTED_PUBLIC_COLUMNS = [
  "id","slug","name","date_raw","sort_date","date_from","date_to",
  "date_is_estimated","is_recurring","town","county","region","country",
  "lat","lng","distances","distance_tags","terrain_tags","entry_fee",
  "entry_url","organiser_url","is_featured","governance","organiser_type",
  "race_profile",
];

describe("homepage curated discovery data access (L3B-2)", () => {
  it("queries events_public_v1", () => {
    expect(source).toContain('.from("events_public_v1")');
  });

  it("does not query the events base table", () => {
    expect(source).not.toContain('.from("events")');
  });

  it("does not add a status = ACTIVE predicate", () => {
    expect(source).not.toContain('.eq("status", "ACTIVE")');
  });

  it("preserves the nearby radius RPC", () => {
    expect(source).toContain('supabase.rpc("events_within_radius"');
  });

  it("preserves the curated query key, ordering and limits", () => {
    expect(source).toContain('queryKey: ["events", "upcoming", "quality-v1"]');
    expect(source).toContain('.order("is_featured", { ascending: false })');
    expect(source).toContain('.order("sort_date", { ascending: true })');
    expect(source).toContain(".limit(20)");
    expect(source).toContain("trusted.slice(0, 9)");
  });

  it("selects only columns within the accepted public projection", () => {
    const selected = DISCOVERY_EVENT_COLUMNS.split(",").map((c) => c.trim());
    for (const column of selected) {
      expect(ACCEPTED_PUBLIC_COLUMNS).toContain(column);
    }
  });
});
