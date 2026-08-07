import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISCOVERY_EVENT_COLUMNS } from "@/lib/events-query";

/**
 * L3B-4 regression: both city discovery consumers must read from the accepted
 * public projection `events_public_v1`, never the `events` base table, and
 * must not re-apply the redundant status predicate.
 */
const source = readFileSync(
  new URL("./city.functions.ts", import.meta.url),
  "utf8",
);

const ACCEPTED_PUBLIC_COLUMNS = [
  "id",
  "slug",
  "name",
  "date_raw",
  "sort_date",
  "date_from",
  "date_to",
  "date_is_estimated",
  "is_recurring",
  "town",
  "county",
  "region",
  "country",
  "lat",
  "lng",
  "distances",
  "distance_tags",
  "terrain_tags",
  "entry_fee",
  "entry_url",
  "organiser_url",
  "is_featured",
  "governance",
  "organiser_type",
  "race_profile",
];

describe("city discovery data access (L3B-4)", () => {
  it("queries events_public_v1 for both city consumers", () => {
    expect(source.match(/\.from\("events_public_v1"\)/g)).toHaveLength(2);
  });

  it("does not query the events base table", () => {
    expect(source).not.toContain('.from("events")');
  });

  it("does not add a status = ACTIVE predicate", () => {
    expect(source).not.toContain('.eq("status", "ACTIVE")');
  });

  it("selects only columns within the accepted public projection", () => {
    const selected = [
      ...DISCOVERY_EVENT_COLUMNS.split(","),
      "lat",
      "lng",
    ].map((column) => column.trim());
    for (const column of selected) {
      expect(ACCEPTED_PUBLIC_COLUMNS).toContain(column);
    }
  });
});
