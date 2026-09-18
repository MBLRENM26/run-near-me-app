import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_ORGANISER_HOSTS,
  buildClubHostIndex,
  eventHost,
  isUnnamedOrganiser,
  proposeOrganiser,
} from "./organiser-resolution";

describe("isUnnamedOrganiser", () => {
  it("treats missing and placeholder values as unnamed", () => {
    expect(isUnnamedOrganiser(null)).toBe(true);
    expect(isUnnamedOrganiser(undefined)).toBe(true);
    expect(isUnnamedOrganiser("")).toBe(true);
    expect(isUnnamedOrganiser("   ")).toBe(true);
    expect(isUnnamedOrganiser("TBC")).toBe(true);
    expect(isUnnamedOrganiser("tbc")).toBe(true);
    expect(isUnnamedOrganiser("Unknown")).toBe(true);
    expect(isUnnamedOrganiser("TBA")).toBe(true);
    expect(isUnnamedOrganiser("N/A")).toBe(true);
  });

  it("treats real names as named", () => {
    expect(isUnnamedOrganiser("RunThrough")).toBe(false);
    expect(isUnnamedOrganiser(" Sedgefield Harriers ")).toBe(false);
    // Not a placeholder we have seen in the data — a real name wins.
    expect(isUnnamedOrganiser("Not the organiser")).toBe(false);
  });
});

describe("eventHost", () => {
  it("normalises protocol, case and www", () => {
    expect(eventHost("https://www.RunThrough.co.uk/events/x")).toBe("runthrough.co.uk");
    expect(eventHost("runthrough.co.uk")).toBe("runthrough.co.uk");
  });

  it("keeps subdomains distinct", () => {
    expect(eventHost("https://zigzagrunning.eventrac.co.uk/race")).toBe(
      "zigzagrunning.eventrac.co.uk",
    );
  });

  it("returns null for invalid input", () => {
    expect(eventHost(null)).toBeNull();
    expect(eventHost("")).toBeNull();
    expect(eventHost("not a url")).toBeNull();
  });
});

describe("buildClubHostIndex", () => {
  it("indexes by normalised website host", () => {
    const index = buildClubHostIndex([
      { id: "c1", name: "Weston AC", website_url: "https://www.westonac.co.uk" },
      { id: "c2", name: "No site", website_url: null },
      { id: "c3", name: "Bad URL", website_url: "not a url" },
    ]);
    expect([
      ...(index.get("westonac.co.uk") ?? []).map((c) => ({ id: c.id, name: c.name })),
    ]).toEqual([{ id: "c1", name: "Weston AC" }]);
    expect(index.size).toBe(1);
  });

  it("keeps multiple clubs sharing a host", () => {
    const index = buildClubHostIndex([
      { id: "c1", name: "Club One", website_url: "https://sharedclubhost.com" },
      { id: "c2", name: "Club Two", website_url: "https://sharedclubhost.com" },
    ]);
    expect(index.get("sharedclubhost.com")).toHaveLength(2);
  });
});

describe("proposeOrganiser", () => {
  const clubIndex = buildClubHostIndex([
    { id: "c1", name: "Tavistock Athletics", website_url: "tavistockathletics.co.uk" },
  ]);

  it("proposes nothing for already-named events", () => {
    expect(
      proposeOrganiser(
        { organiser: "RunThrough", organiser_url: "https://runthrough.co.uk/x" },
        clubIndex,
      ),
    ).toBeNull();
  });

  it("proposes nothing without an organiser URL", () => {
    expect(proposeOrganiser({ organiser: "TBC", organiser_url: null }, clubIndex)).toBeNull();
    expect(proposeOrganiser({ organiser: null, organiser_url: "   " }, clubIndex)).toBeNull();
  });

  it("proposes the club name on a club-domain match", () => {
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://www.tavistockathletics.co.uk/races" },
        clubIndex,
      ),
    ).toEqual({ organiser: "Tavistock Athletics", organiser_type: "club", basis: "club-domain" });
  });

  it("club-domain match beats the commercial map", () => {
    const bothIndex = buildClubHostIndex([
      { id: "c1", name: "RunThrough Running Club", website_url: "runthrough.co.uk" },
    ]);
    expect(
      proposeOrganiser({ organiser: null, organiser_url: "https://runthrough.co.uk" }, bothIndex),
    ).toEqual({
      organiser: "RunThrough Running Club",
      organiser_type: "club",
      basis: "club-domain",
    });
  });

  it("proposes reviewed commercial organisers", () => {
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://www.runforall.com/event/x" },
        clubIndex,
      ),
    ).toEqual({ organiser: "Run For All", organiser_type: "commercial", basis: "commercial-map" });
  });

  it("never proposes from entry platforms or aggregators", () => {
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://www.sientries.co.uk/event.php?id=1" },
        clubIndex,
      ),
    ).toBeNull();
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://englandathletics.org" },
        clubIndex,
      ),
    ).toBeNull();
    // Sub-domain tenants on an entry platform are not the platform brand.
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://zigzagrunning.eventrac.co.uk/race" },
        clubIndex,
      ),
    ).toBeNull();
  });

  it("never proposes for hosts missing from both the clubs index and the map", () => {
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://some-unknown-organiser.example/race" },
        clubIndex,
      ),
    ).toBeNull();
  });

  it("commercial map stays small and every name is non-empty", () => {
    const hosts = Object.keys(COMMERCIAL_ORGANISER_HOSTS);
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
      expect(COMMERCIAL_ORGANISER_HOSTS[host].trim().length).toBeGreaterThan(0);
      expect(host).not.toMatch(/^www\./);
    }
  });
});
