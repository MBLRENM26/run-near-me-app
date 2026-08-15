import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPilotDestinations,
  resolvePanelLayout,
  resolvePilotCandidates,
  type PublicDestination,
} from "./pilot-destinations";
import { classifyEventLink, isEntryPlatformHost } from "./link-trust";

const SATURN_ROW = {
  id: "adb1a4f8-504d-44bd-99d0-94d8b6346542",
  organiser: "Saturn Running",
  organiser_type: "unknown",
  organiser_url: "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  entry_url: "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  source: "tra",
  source_url: "https://races.tra-uk.org/race-directory/view/7708",
  governance: "tra",
};

const FNUL_ROW = {
  id: "2eda5231-ac29-4b4d-bebd-e4f98dd24bf6",
  organiser: "Friday Night Under the Lights 5K",
  organiser_type: "unknown",
  organiser_url: "https://www.fridaynightunderthelights5k.co.uk/",
  entry_url: "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/",
  source: "england-athletics",
  source_url:
    "https://www.englandathletics.org/runevents/search/?query=Friday%20Night%20Under%20the%20Lights%20Race%20Series%2026",
  governance: "england_athletics",
};

const DUCKY_ROW = {
  id: "7a2160ea-3b20-431e-9a9c-69048237686f",
  organiser: null,
  organiser_type: "unknown",
  organiser_url: "https://races.tra-uk.org/race-directory/view/7709",
  entry_url: "",
  source: "tra",
  source_url: "https://races.tra-uk.org/race-directory/view/7709",
  governance: "tra",
};

const SEDGEFIELD_ROW = {
  id: "c8eea9cc-0d2a-4db4-8bac-a7040b43dd59",
  organiser: null,
  organiser_type: "governing_body",
  organiser_url: "https://sedgefieldharriers.co.uk/sedgefield-serpentine/",
  entry_url: "https://englandathletics.sport80.com/public/wizard/e/30356",
  source: "england-athletics",
  source_url: "https://www.englandathletics.org/runevents/search/?query=Sedgefield%20Serpentine%202026",
  governance: "england_athletics",
};

const HERTS_ROW = {
  id: "ab287a93-9062-4d67-9ccf-eb489bcee7bb",
  organiser: "RunThrough",
  organiser_type: "commercial",
  organiser_url: "https://www.hertshalf.com/",
  entry_url: "https://www.runthrough.co.uk/event/hertfordshire-half-marathon-10k-november-2026",
  source: "runabc",
  source_url: "https://runabc.co.uk/hertfordshire-half-marathon",
  governance: "unknown",
};

describe("buildPilotDestinations — retained Saturn pilot", () => {
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
      shortLabel: "Enter with Saturn Running",
      href: SATURN_ROW.entry_url,
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      roleLabel: "Licence",
      provider: "Trail Running Association",
      action: "View TRA permit 8570",
      shortLabel: "View TRA permit 8570",
      href: "https://races.tra-uk.org/race-directory/view/7708",
      destinationRole: "licence_record",
      linkType: "organiser-other",
    });
    expect(d[1].supportingText).toBeUndefined();
  });

  it("dedupes the official-details candidate that shares the entry URL", () => {
    const raw = resolvePilotCandidates([
      {
        role: "entry",
        provider: "Saturn Running",
        action: "View entry options",
        href: SATURN_ROW.entry_url,
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Saturn Running",
        action: "View official race details",
        href: SATURN_ROW.entry_url,
        destinationRole: "official_information",
      },
    ]);
    expect(raw.map((x) => x.role)).toEqual(["entry"]);

    expect(d).toHaveLength(2);
    expect(d.filter((x) => x.href === SATURN_ROW.entry_url)).toHaveLength(1);
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
      shortLabel: "Enter via OpenTrack",
      href: "https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/",
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      roleLabel: "Official details",
      provider: "Friday Night Under the Lights 5K",
      action: "Visit official race website",
      shortLabel: "FNUL race website",
      href: "https://www.fridaynightunderthelights5k.co.uk/",
      destinationRole: "official_information",
      linkType: "organiser-other",
    });
  });

  it("never exposes the England Athletics source URL", () => {
    expect(JSON.stringify(d)).not.toContain("englandathletics.org");
  });
});

describe("buildPilotDestinations — Rubber Ducky Waddle", () => {
  const d = buildPilotDestinations(DUCKY_ROW);

  it("returns entry, licence and course in reviewed order", () => {
    expect(d.map((x) => x.role)).toEqual(["entry", "licence", "course"]);
    expect(d[0]).toMatchObject({
      provider: "Saturn Running",
      action: "Enter event",
      supportingText: "Entry powered by Eventrac",
      href: "https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932",
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      provider: "Trail Running Association",
      action: "View approved TRA permit 8571",
      shortLabel: "View TRA permit 8571",
      href: "https://races.tra-uk.org/race-directory/view/7709",
      destinationRole: "licence_record",
    });
    expect(d[2]).toMatchObject({
      roleLabel: "Course",
      provider: "Saturn Running",
      action: "View course map",
      shortLabel: "Course map",
      href: "https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932/route-maps",
      destinationRole: "official_information",
      linkType: "organiser-other",
    });
  });

  it("dedupes the official-details candidate behind entry", () => {
    expect(d).toHaveLength(3);
    expect(d.filter((x) => x.role === "official_details")).toHaveLength(0);
  });

  it("fails closed on drift", () => {
    expect(buildPilotDestinations({ ...DUCKY_ROW, entry_url: null })).toEqual([]);
    expect(buildPilotDestinations({ ...DUCKY_ROW, organiser: "Saturn Running" })).toEqual([]);
    expect(buildPilotDestinations({ ...DUCKY_ROW, organiser_type: "commercial" })).toEqual([]);
    expect(buildPilotDestinations({ ...DUCKY_ROW, governance: "unknown" })).toEqual([]);
  });
});

describe("buildPilotDestinations — Sedgefield Serpentine 2026", () => {
  const d = buildPilotDestinations(SEDGEFIELD_ROW);

  it("returns the five reviewed destinations in order", () => {
    expect(d.map((x) => x.role)).toEqual([
      "entry",
      "official_details",
      "governing_listing",
      "athlete_information",
      "course",
    ]);
    expect(d[0]).toMatchObject({
      provider: "Sport:80",
      action: "Enter event",
      shortLabel: "Enter via Sport:80",
      href: SEDGEFIELD_ROW.entry_url,
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      provider: "Sedgefield Harriers",
      action: "Visit official race page",
      shortLabel: "Sedgefield Harriers website",
      href: SEDGEFIELD_ROW.organiser_url,
    });
    expect(d[2]).toMatchObject({
      roleLabel: "Governing-body listing",
      provider: "England Athletics",
      action: "View England Athletics listing",
      shortLabel: "England Athletics listing",
      href: SEDGEFIELD_ROW.source_url,
      destinationRole: "official_information",
      linkType: "organiser-other",
    });
    expect(d[3]).toMatchObject({
      action: "Read 2026 athlete information",
      shortLabel: "Athlete information",
    });
    expect(d[4]).toMatchObject({
      roleLabel: "Course",
      action: "View 2026 course map",
      shortLabel: "Course map",
    });
  });

  it("never labels the listing as a licence or approval and has no results destination", () => {
    const json = JSON.stringify(d);
    expect(json).not.toContain("Licence");
    expect(json).not.toContain("Approved");
    expect(json).not.toContain("licence_record");
    expect(d.filter((x) => x.role === "results")).toHaveLength(0);
  });

  it("fails closed on drift", () => {
    expect(buildPilotDestinations({ ...SEDGEFIELD_ROW, organiser_type: "unknown" })).toEqual([]);
    expect(
      buildPilotDestinations({ ...SEDGEFIELD_ROW, organiser_url: "https://sedgefieldharriers.co.uk/" }),
    ).toEqual([]);
    expect(buildPilotDestinations({ ...SEDGEFIELD_ROW, source_url: "" })).toEqual([]);
  });
});

describe("buildPilotDestinations — Hertfordshire Half Marathon & 10K", () => {
  const d = buildPilotDestinations(HERTS_ROW);

  it("returns exactly the two reviewed outbound destinations", () => {
    expect(d.map((x) => x.role)).toEqual(["entry", "official_details"]);
    expect(d).toHaveLength(2);
    expect(d[0]).toMatchObject({
      provider: "RunThrough",
      action: "Enter event",
      shortLabel: "Enter with RunThrough",
      href: HERTS_ROW.entry_url,
      destinationRole: "booking_destination",
      linkType: "entry",
    });
    expect(d[1]).toMatchObject({
      provider: "Hertfordshire Half Marathon",
      action: "Visit official event website",
      shortLabel: "Herts Half website",
      href: HERTS_ROW.organiser_url,
    });
  });

  it("contains no Strava course destinations", () => {
    const json = JSON.stringify(d);
    expect(json).not.toContain("strava.com");
    expect(json).not.toContain("3154410119536065762");
    expect(json).not.toContain("3154410864891912034");
    expect(d.filter((x) => x.role === "course")).toHaveLength(0);
  });

  it("never leaks the private runABC provenance and asserts no governance", () => {
    const json = JSON.stringify(d);
    expect(json).not.toContain("runabc");
    expect(json).not.toContain("Licence");
    expect(json).not.toContain("England Athletics");
    expect(json).not.toContain("licence_record");
  });

  it("fails closed on drift", () => {
    expect(buildPilotDestinations({ ...HERTS_ROW, source_url: "https://runabc.co.uk/other" })).toEqual(
      [],
    );
    expect(buildPilotDestinations({ ...HERTS_ROW, governance: "england_athletics" })).toEqual([]);
    expect(buildPilotDestinations({ ...HERTS_ROW, organiser: null })).toEqual([]);
  });
});

describe("buildPilotDestinations — fail-closed", () => {
  it("returns empty for a non-showcase event", () => {
    expect(
      buildPilotDestinations({
        ...SATURN_ROW,
        id: "00000000-0000-0000-0000-000000000000",
      }),
    ).toEqual([]);
  });

  it("returns empty on any field drift", () => {
    expect(buildPilotDestinations({ ...SATURN_ROW, organiser: "Saturn Running Ltd" })).toEqual([]);
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

  it("returns empty when organiser_type drifts", () => {
    expect(buildPilotDestinations({ ...SATURN_ROW, organiser_type: "club" })).toEqual([]);
    expect(buildPilotDestinations({ ...FNUL_ROW, organiser_type: null })).toEqual([]);
  });

  it("drops untrusted/invalid destination URLs in the candidate resolver", () => {
    const out = resolvePilotCandidates([
      {
        role: "entry",
        provider: "Aggregator",
        action: "View entry options",
        href: "https://findarace.com/race/x",
        destinationRole: "booking_destination",
      },
      {
        role: "official_details",
        provider: "Broken",
        action: "Visit official race website",
        href: "not a url",
        destinationRole: "official_information",
      },
      {
        role: "licence",
        provider: "Trail Running Association",
        action: "View TRA permit 8570",
        href: "https://races.tra-uk.org/race-directory/view/7708",
        destinationRole: "licence_record",
      },
    ]);
    expect(out.map((x) => x.role)).toEqual(["licence"]);
    expect(classifyEventLink("https://findarace.com/race/x").kind).toBe("untrusted");
    expect(classifyEventLink("not a url").kind).toBe("invalid");
  });

  it("only exempts a reviewed governing-body listing from the aggregator gate", () => {
    expect(
      resolvePilotCandidates([
        {
          role: "official_details",
          provider: "England Athletics",
          action: "Visit official race website",
          href: "https://www.englandathletics.org/runevents/search/?query=x",
          destinationRole: "official_information",
          reviewedListingExempt: true,
        },
      ]),
    ).toEqual([]);
    expect(
      resolvePilotCandidates([
        {
          role: "governing_listing",
          provider: "England Athletics",
          action: "View England Athletics listing",
          href: "not a url",
          destinationRole: "official_information",
          reviewedListingExempt: true,
        },
      ]),
    ).toEqual([]);
  });
});

describe("resolvePanelLayout — post-race lifecycle", () => {
  const ducky = buildPilotDestinations(DUCKY_ROW);

  it("makes entry primary before the race", () => {
    const { primary, secondary, awaitingResults } = resolvePanelLayout(ducky);
    expect(primary?.role).toBe("entry");
    expect(secondary.map((x) => x.role)).toEqual(["licence", "course"]);
    expect(awaitingResults).toBe(false);
  });

  it("suppresses entry after the race and awaits results", () => {
    const { primary, secondary, awaitingResults } = resolvePanelLayout(ducky, { isPast: true });
    expect(primary).toBeNull();
    expect(awaitingResults).toBe(true);
    expect(secondary.map((x) => x.role)).toEqual(["licence", "course"]);
  });

  it("promotes an explicitly reviewed results destination after the race", () => {
    const results: PublicDestination = {
      role: "results",
      roleLabel: "Results",
      provider: "Saturn Running",
      action: "View 2026 results",
      href: "https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932/results",
      host: "saturnrunning.co.uk",
      destinationRole: "official_information",
      linkType: "organiser-other",
    };
    const withResults = resolvePilotCandidates([
      ...ducky.map(({ roleLabel: _r, host: _h, linkType: _l, ...c }) => c),
      { ...results },
    ]);
    const { primary, awaitingResults, secondary } = resolvePanelLayout(withResults, {
      isPast: true,
    });
    expect(primary?.role).toBe("results");
    expect(awaitingResults).toBe(false);
    expect(secondary.some((x) => x.role === "entry")).toBe(false);
  });
});

describe("OpenTrack provider classification", () => {
  it("treats data.opentrack.run as a registration provider", () => {
    expect(isEntryPlatformHost("data.opentrack.run")).toBe(true);
    expect(isEntryPlatformHost("opentrack.run")).toBe(true);
  });

  it("classifies the exact OpenTrack occurrence URL as an entry page", () => {
    const link = classifyEventLink("https://data.opentrack.run/en-gb/x/2026/GBR/fnulsept5k/");
    expect(link.kind).toBe("entry");
    expect(link.host).toBe("data.opentrack.run");
  });
});

describe("source provenance boundary in getEventPageData", () => {
  const SOURCE = readFileSync(resolve(process.cwd(), "src/lib/events.functions.ts"), "utf8");

  it("strips source and source_url from the public event object", () => {
    expect(SOURCE).toContain("source: _source,");
    expect(SOURCE).toContain("source_url: _source_url,");
    const destructureIndex = SOURCE.indexOf("source_url: _source_url,");
    const publicIndex = SOURCE.indexOf("...eventPublic", destructureIndex);
    expect(publicIndex).toBeGreaterThan(destructureIndex);
  });
});
