import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPilotDestinations } from "./pilot-destinations";
import { classifyEventLink, isEntryPlatformHost } from "./link-trust";

const SATURN_ROW = {
  id: "adb1a4f8-504d-44bd-99d0-94d8b6346542",
  organiser: "Saturn Running",
  organiser_url:
    "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  entry_url:
    "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  source: "tra",
  source_url: "https://races.tra-uk.org/race-directory/view/7708",
  governance: "tra",
};

const FNUL_ROW = {
  id: "2eda5231-ac29-4b4d-bebd-e4f98dd24bf6",
  organiser: "Friday Night Under the Lights 5K",
  organiser_url: "https://www.fridaynightunderthelights5k.co.uk/",
  entry_url: "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/",
  source: "england-athletics",
  source_url:
    "https://www.englandathletics.org/runevents/search/?query=Friday%20Night%20Under%20the%20Lights%20Race%20Series%2026",
  governance: "england_athletics",
};

describe("buildPilotDestinations — Saturn manifest", () => {
  const d = buildPilotDestinations(SATURN_ROW);

  it("returns exactly two destinations in reviewed order", () => {
    expect(d.map((x) => x.role)).toEqual(["entry", "licence"]);
  });

  it("has the approved providers, actions and supporting text", () => {
    expect(d[0]).toMatchObject({
      roleLabel: "Entry",
      provider: "Saturn Running",
      action: "View entry options",
      supportingText: "Entry powered by Eventrac",
      href: SATURN_ROW.entry_url,
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      roleLabel: "Licence",
      provider: "Trail Running Association",
      action: "View TRA permit 8570",
      href: "https://races.tra-uk.org/race-directory/view/7708",
      destinationRole: "licence_record",
      linkType: "organiser-other",
    });
    expect(d[1].supportingText).toBeUndefined();
  });

  it("does not render a separate official-details link (identical URL)", () => {
    expect(d.filter((x) => x.role === "official_details")).toHaveLength(0);
    const occurrences = d.filter((x) => x.href === SATURN_ROW.entry_url);
    expect(occurrences).toHaveLength(1);
  });
});

describe("buildPilotDestinations — FNUL manifest", () => {
  const d = buildPilotDestinations(FNUL_ROW);

  it("returns entry then official details", () => {
    expect(d.map((x) => x.role)).toEqual(["entry", "official_details"]);
    expect(d[0]).toMatchObject({
      provider: "OpenTrack",
      action: "View entry status on OpenTrack",
      supportingText: "Specific 11 September 2026 occurrence",
      href: "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/",
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      roleLabel: "Official details",
      provider: "Friday Night Under the Lights 5K",
      action: "Visit official race website",
      href: "https://www.fridaynightunderthelights5k.co.uk/",
      destinationRole: "official_information",
      linkType: "organiser-other",
    });
  });

  it("never exposes the England Athletics source URL", () => {
    const json = JSON.stringify(d);
    expect(json).not.toContain("englandathletics.org");
  });
});

describe("buildPilotDestinations — fail-closed", () => {
  it("returns empty for a non-pilot event", () => {
    expect(
      buildPilotDestinations({
        id: "00000000-0000-0000-0000-000000000000",
        organiser: "Saturn Running",
        organiser_url: SATURN_ROW.organiser_url,
        entry_url: SATURN_ROW.entry_url,
        source: "tra",
        source_url: SATURN_ROW.source_url,
        governance: "tra",
      }),
    ).toEqual([]);
  });

  it("returns empty on any field drift", () => {
    expect(
      buildPilotDestinations({ ...SATURN_ROW, organiser: "Saturn Running Ltd" }),
    ).toEqual([]);
    expect(
      buildPilotDestinations({
        ...SATURN_ROW,
        source_url: "https://races.tra-uk.org/race-directory/view/9999",
      }),
    ).toEqual([]);
    expect(buildPilotDestinations({ ...FNUL_ROW, governance: null })).toEqual([]);
    expect(
      buildPilotDestinations({
        ...FNUL_ROW,
        entry_url: "https://data.opentrack.run/en-gb/x/2026/GBR/other/",
      }),
    ).toEqual([]);
    expect(buildPilotDestinations(null)).toEqual([]);
  });

  it("drops untrusted/invalid destination URLs before rendering", () => {
    // Trust gate proof: an aggregator or malformed URL is never trusted, so
    // the same gate the manifest uses would drop it.
    expect(classifyEventLink("https://findarace.com/race/x").kind).toBe(
      "untrusted",
    );
    expect(classifyEventLink("not a url").kind).toBe("invalid");
  });
});

describe("OpenTrack provider classification", () => {
  it("treats data.opentrack.run as a registration provider", () => {
    expect(isEntryPlatformHost("data.opentrack.run")).toBe(true);
    expect(isEntryPlatformHost("opentrack.run")).toBe(true);
  });

  it("classifies the exact OpenTrack occurrence URL as an entry page", () => {
    const link = classifyEventLink(
      "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/",
    );
    expect(link.kind).toBe("entry");
    expect(link.host).toBe("data.opentrack.run");
  });
});

describe("source provenance boundary in getEventPageData", () => {
  const SOURCE = readFileSync(
    resolve(process.cwd(), "src/lib/events.functions.ts"),
    "utf8",
  );

  it("strips source and source_url from the public event object", () => {
    expect(SOURCE).toContain("source: _source,");
    expect(SOURCE).toContain("source_url: _source_url,");
    const destructureIndex = SOURCE.indexOf("source_url: _source_url,");
    const publicIndex = SOURCE.indexOf("...eventPublic", destructureIndex);
    expect(publicIndex).toBeGreaterThan(destructureIndex);
  });
});
