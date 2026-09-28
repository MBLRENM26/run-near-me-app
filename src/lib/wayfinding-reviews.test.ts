import { describe, expect, it } from "vitest";
import { WAYFINDING_REVIEWS, findWayfindingReview } from "./wayfinding-reviews";
import { buildReviewedDestinations } from "./reviewed-destinations";
import { hasDiscoverableLink, normalizeUrl } from "./link-trust";
import { buildEventCtas } from "./event-ctas";
import { hydrateReviewedOccurrences } from "./reviewed-occurrences";
import { buildWatchTargets } from "./change-feed-watchlist";
import { resolvePanelLayout } from "./pilot-destinations";

const horse = WAYFINDING_REVIEWS[0].expected;
const opts = { isPast: false, proximity: null } as const;

describe("reviewed wayfinding", () => {
  it("admits a checked provider-only race without admitting every provider URL", () => {
    expect(hasDiscoverableLink(horse.entry_url, horse.organiser_url, "unknown", horse)).toBe(true);
    expect(hasDiscoverableLink(horse.entry_url, horse.organiser_url, "unknown")).toBe(false);
    expect(hasDiscoverableLink("https://www.sientries.co.uk/", null, "england_athletics")).toBe(
      false,
    );
  });
  it.each([
    { id: "another-race" },
    { sort_date: "2027-10-18" },
    { entry_url: "https://www.entrycentral.com/another-race" },
    { organiser_url: null },
  ])("invalidates review when identifying data changes: %j", (change) => {
    expect(findWayfindingReview({ ...horse, ...change })).toBeUndefined();
    expect(buildReviewedDestinations({ ...horse, ...change })).toEqual([]);
  });
  it("does not let supplied occurrence URLs override the actual links", () => {
    expect(hasDiscoverableLink(null, null, "unknown", horse)).toBe(false);
  });
  it("labels a listing separately and carries dated closed-entry evidence", () => {
    const destinations = buildReviewedDestinations(WAYFINDING_REVIEWS[2].expected);
    expect(destinations[0].destinationRole).toBe("third_party_listing");
    expect(destinations[0].action).toBe("View listing on Find a Race");
    expect(destinations[0].reviewNote).toContain("closed when reviewed");
    expect(destinations[0].reviewedOn).toBe("2026-09-28");
  });
  it("suppresses entry actions after an occurrence", () => {
    const layout = resolvePanelLayout(buildReviewedDestinations(horse), { isPast: true });
    expect(JSON.stringify(layout)).not.toContain(horse.entry_url);
  });
  it("never presents a bare PayPal account as an entry or monitoring destination", () => {
    const row = { entry_url: "https://paypal.me/example-race" };
    expect(buildEventCtas(row, opts)).toBeNull();
    expect(buildWatchTargets(row)).toEqual([]);
  });
  it.each([
    "javascript:alert(1)",
    "https://user:pass@example.com/race",
    "http://127.0.0.1/race",
    "http://race.local/",
    "https://localhost/",
  ])("rejects unsafe URL %s", (url) => {
    expect(normalizeUrl(url)).toBeNull();
  });
  it("uses neutral provider labels and preserves distinct URLs on the same host", () => {
    const result = buildEventCtas(
      {
        entry_url: "https://www.sientries.co.uk/event.php?event_id=17387",
        organiser_url: "https://www.sientries.co.uk/",
      },
      opts,
    );
    expect(result?.primary.label).toBe("Check entries at SI Entries");
    expect(result?.secondary?.label).toBe("Visit SI Entries");
    expect(buildEventCtas(horse, opts)?.secondary).toBeNull();
    expect(buildEventCtas(horse, { ...opts, isPast: true })).toBeNull();
  });
  it("hydrates only reviewed RPC candidates and fails closed if the occurrence moved", async () => {
    const row = { id: horse.id, entry_url: horse.entry_url, organiser_url: horse.organiser_url };
    const rows = await hydrateReviewedOccurrences([row, { id: "unreviewed" }], async (ids) => {
      expect(ids).toEqual([horse.id]);
      return [{ id: horse.id!, sort_date: "2027-10-18" }];
    });
    expect(findWayfindingReview(rows[0])).toBeUndefined();
    const missing = await hydrateReviewedOccurrences([row], async () => []);
    expect(findWayfindingReview(missing[0])).toBeUndefined();
    const matched = await hydrateReviewedOccurrences([row], async () => [
      { id: horse.id!, sort_date: horse.sort_date },
    ]);
    expect(findWayfindingReview(matched[0])).toBeDefined();
  });
  it("adds reviewed destinations to the watchlist without labelling raw URLs verified", () => {
    const targets = buildWatchTargets(WAYFINDING_REVIEWS[3].expected);
    expect(
      targets.some((t) => t.provider === "Stamford Striders" && t.reviewed_on === "2026-09-28"),
    ).toBe(true);
    expect(buildWatchTargets({ entry_url: "https://example.com/race" })[0].role).toBe("unreviewed");
    expect(buildWatchTargets(horse)).toHaveLength(1);
  });
});
