import { describe, expect, it } from "vitest";
import {
  REVENUE_THRESHOLDS,
  countOrganisersWithReach,
  entryPlatformExposure,
  evaluateGates,
  organiserLabel,
  organiserReach,
} from "@/lib/revenue-evidence";

describe("entryPlatformExposure", () => {
  it("counts each event once per platform host and computes shares", () => {
    const result = entryPlatformExposure([
      { entry_url: "https://www.sientries.co.uk/event.php?elid=1", organiser_url: null },
      { entry_url: "https://sientries.co.uk/event.php?elid=2", organiser_url: null },
      { entry_url: "https://racebest.com/races/abc", organiser_url: null },
      // organiser-owned only — not an entry platform, so excluded
      { entry_url: null, organiser_url: "https://tettenhallrace.co.uk" },
      // aggregator — never counted
      { entry_url: "https://findarace.com/events/x", organiser_url: null },
    ]);

    expect(result.total).toBe(3);
    expect(result.platforms[0]).toEqual({ host: "sientries.co.uk", events: 2, sharePct: 67 });
    expect(result.topSharePct).toBe(67);
    expect(result.platforms.map((p) => p.host)).toEqual(["sientries.co.uk", "racebest.com"]);
  });

  it("does not double count when entry and organiser sit on the same platform", () => {
    const result = entryPlatformExposure([
      {
        entry_url: "https://sientries.co.uk/event.php?elid=1",
        organiser_url: "https://sientries.co.uk",
      },
    ]);
    expect(result.total).toBe(1);
    expect(result.platforms).toEqual([{ host: "sientries.co.uk", events: 1, sharePct: 100 }]);
  });

  it("returns zeroes for no qualifying rows", () => {
    expect(entryPlatformExposure([])).toEqual({ platforms: [], total: 0, topSharePct: 0 });
  });
});

describe("organiserLabel", () => {
  const base = { id: "1", slug: "a", organiser: null, organiser_url: null, entry_url: null, discoverable: false };

  it("prefers the stored organiser name", () => {
    expect(organiserLabel({ ...base, organiser: "  Sedgefield Harriers " })).toBe(
      "Sedgefield Harriers",
    );
  });

  it("falls back to the organiser-owned host", () => {
    expect(organiserLabel({ ...base, organiser_url: "https://www.tettenhallrace.co.uk" })).toBe(
      "tettenhallrace.co.uk",
    );
  });

  it("never labels an organiser from an entry platform or aggregator", () => {
    expect(organiserLabel({ ...base, entry_url: "https://sientries.co.uk/event.php?x=1" })).toBeNull();
    expect(organiserLabel({ ...base, organiser_url: "https://findarace.com/e/x" })).toBeNull();
  });
});

describe("organiserReach", () => {
  it("aggregates events and demand signals per organiser, ranked by signals", () => {
    const rows = [
      { id: "e1", slug: "race-one", organiser: "Club A", organiser_url: null, entry_url: null, discoverable: true },
      { id: "e2", slug: "race-two", organiser: "Club A", organiser_url: null, entry_url: null, discoverable: false },
      { id: "e3", slug: "race-three", organiser: "Club B", organiser_url: null, entry_url: null, discoverable: true },
    ];
    const clicks = new Map([
      ["race-one", 5],
      ["race-three", 20],
    ]);
    const reminders = new Map([["e2", 3]]);

    const out = organiserReach(rows, clicks, reminders);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      organiser: "Club B",
      future_events: 1,
      discoverable_events: 1,
      search_clicks: 20,
      reminder_requests: 0,
      demand_signals: 20,
    });
    expect(out[1].demand_signals).toBe(8);
    expect(countOrganisersWithReach(out, 10)).toBe(1);
  });
});

describe("evaluateGates", () => {
  const met = {
    reminderRequests: 100,
    repeatRunnerEmails: 50,
    organisersWithReach: 40,
    topPlatformSharePct: 80,
    monthlyPageviews: 100_000,
  };

  it("marks all gates met on strong evidence", () => {
    expect(evaluateGates(met).every((g) => g.met)).toBe(true);
  });

  it("requires both reminder volume and repeat runners for the subscription gate", () => {
    const gates = evaluateGates({ ...met, repeatRunnerEmails: 0 });
    expect(gates.find((g) => g.id === "subscription")?.met).toBe(false);
  });

  it("treats a missing pageview figure as not met rather than guessing", () => {
    const gates = evaluateGates({ ...met, monthlyPageviews: null });
    const ads = gates.find((g) => g.id === "ads")!;
    expect(ads.met).toBe(false);
    expect(ads.metric).toContain("no pageview figure");
  });

  it("exposes thresholds on every gate", () => {
    for (const gate of evaluateGates(met)) expect(gate.threshold).toBeGreaterThan(0);
    expect(REVENUE_THRESHOLDS.affiliatePlatformSharePct).toBe(50);
  });
});
