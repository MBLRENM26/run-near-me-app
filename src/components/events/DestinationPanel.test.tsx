import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DestinationPanel } from "./DestinationPanel";
import { buildPilotDestinations, type PublicDestination } from "@/lib/pilot-destinations";

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
  source_url:
    "https://www.englandathletics.org/runevents/search/?query=Sedgefield%20Serpentine%202026",
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

const render = (row: Parameters<typeof buildPilotDestinations>[0], isPast = false) =>
  renderToStaticMarkup(
    <DestinationPanel destinations={buildPilotDestinations(row)} isPast={isPast} />,
  );

/** Visible text only: strip attributes (aria-label, href) and sr-only spans. */
const visibleText = (html: string) =>
  html
    .replace(/<[^>]*>/g, "\u0000")
    .split("\u0000")
    .filter(Boolean)
    .join(" ");

describe("DestinationPanel shell", () => {
  const html = render(SATURN_ROW);

  it("keeps the heading accessible but screen-reader-only", () => {
    expect(html).toContain('aria-labelledby="race-links"');
    expect(html).toContain('id="race-links" class="sr-only"');
    expect(html).not.toContain("Where to go next");
  });

  it("keeps external-link semantics", () => {
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders the duplicated Saturn URL only once", () => {
    const occurrences = html.split(SATURN_ROW.entry_url).length - 1;
    expect(occurrences).toBe(1);
  });

  it("renders nothing for an empty manifest", () => {
    expect(renderToStaticMarkup(<DestinationPanel destinations={[]} />)).toBe("");
  });
});

describe("DestinationPanel concise visible labels", () => {
  it("Saturn (2 links)", () => {
    const text = visibleText(render(SATURN_ROW));
    expect(text).toContain("Enter with Saturn Running");
    expect(text).toContain("View TRA permit 8570");
  });

  it("FNUL (2 links)", () => {
    const text = visibleText(render(FNUL_ROW));
    expect(text).toContain("Enter via OpenTrack");
    expect(text).toContain("FNUL race website");
  });

  it("Rubber Ducky (3 links)", () => {
    const text = visibleText(render(DUCKY_ROW));
    expect(text).toContain("Enter with Saturn Running");
    expect(text).toContain("View TRA permit 8571");
    expect(text).toContain("Course map");
  });

  it("Hertfordshire (2 links, no Strava courses)", () => {
    const html = render(HERTS_ROW);
    const text = visibleText(html);
    expect(text).toContain("Enter with RunThrough");
    expect(text).toContain("Herts Half website");
    expect(html).not.toContain("strava.com");
    expect(html).not.toContain("3154410119536065762");
    expect(html).not.toContain("3154410864891912034");
    expect(html.split("<li").length - 1).toBe(1);
  });

  it("Sedgefield (5 links)", () => {
    const text = visibleText(render(SEDGEFIELD_ROW));
    expect(text).toContain("Enter via Sport:80");
    expect(text).toContain("Sedgefield Harriers website");
    expect(text).toContain("England Athletics listing");
    expect(text).toContain("Athlete information");
    expect(text).toContain("Course map");
  });
});

describe("DestinationPanel visual declutter", () => {
  it("shows no visible provider lines, hosts or supporting copy", () => {
    for (const row of [SATURN_ROW, FNUL_ROW, DUCKY_ROW, SEDGEFIELD_ROW, HERTS_ROW]) {
      const text = visibleText(render(row));
      expect(text).not.toContain("Entry powered by Eventrac");
      expect(text).not.toContain("Governing-body listing");
      expect(text).not.toContain("Official details");
      expect(text).not.toContain("saturnrunning.co.uk");
      expect(text).not.toContain("strava.com");
      expect(text).not.toContain("underline");
    }
  });

  it("retains role and provider context in accessible names", () => {
    const html = render(SEDGEFIELD_ROW);
    expect(html).toContain("Governing-body listing, England Athletics");
    expect(html).toContain("opens in a new tab");
  });

  it("never leaks private provenance", () => {
    expect(render(HERTS_ROW)).not.toContain("runabc");
    expect(render(FNUL_ROW)).not.toContain("englandathletics.org");
  });
});

describe("DestinationPanel rail and affordance", () => {
  it("shrink-wraps the pale rail on desktop and fills width on mobile", () => {
    const html = render(SEDGEFIELD_ROW);
    expect(html).toContain("w-full rounded-xl");
    expect(html).toContain("sm:w-fit");
    expect(html).toContain("sm:max-w-full");
  });

  it("makes secondary signposts obviously clickable", () => {
    const html = render(SEDGEFIELD_ROW);
    expect(html).toContain("border-primary/30");
    expect(html).toContain("font-semibold");
    expect(html).toContain("hover:border-primary");
    expect(html).toContain("focus-visible:outline");
    expect(html).toContain("<svg");
  });
});

describe("DestinationPanel count-aware geometry", () => {
  const counts = (row: Parameters<typeof buildPilotDestinations>[0]) => {
    const html = render(row);
    return { html, items: html.split("<li").length - 1 };
  };

  it("2 total: one compact pair that does not grow across the strip", () => {
    const { html, items } = counts(FNUL_ROW);
    expect(items).toBe(1);
    expect(html).toContain('data-secondary-count="1"');
    expect(html).toContain("grid-cols-1");
    expect(html).not.toContain("flex-1");
    expect(html).toContain("sm:w-auto");
    expect(html).toContain("sm:w-[170px]");
  });

  it("3 total: two balanced secondary signposts in one row", () => {
    const { html, items } = counts(DUCKY_ROW);
    expect(items).toBe(2);
    expect(html).toContain('data-secondary-count="2"');
    expect(html).toContain("grid-cols-2");
  });

  it("5 total: exactly four secondary signposts as a 2x2 grid", () => {
    const { html, items } = counts(SEDGEFIELD_ROW);
    expect(items).toBe(4);
    expect(html).toContain('data-secondary-count="4"');
    expect(html).toContain("grid-cols-2");
    expect(html).not.toContain("lg:grid-cols-3");
  });

  it("keeps the primary a fixed, vertically centred signpost", () => {
    for (const row of [FNUL_ROW, SEDGEFIELD_ROW]) {
      const html = render(row);
      expect(html).toContain("sm:items-center");
      expect(html).toContain("sm:w-[200px]");
      expect(html).toContain("h-[54px]");
      expect(html).not.toContain("h-full");
      expect(html).not.toContain("items-stretch");
      expect(html).not.toContain("row-span");
    }
  });

  it("gives every secondary signpost identical height and shape", () => {
    const html = render(SEDGEFIELD_ROW);
    const shape = "flex h-[46px] w-full items-center justify-center gap-1.5 rounded-lg border";
    expect(html.split(shape).length - 1).toBe(4);
  });
});

describe("DestinationPanel post-race state", () => {
  const html = render(DUCKY_ROW, true);

  it("suppresses the entry anchor", () => {
    expect(html).not.toContain('https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932"');
    expect(visibleText(html)).not.toContain("Enter with Saturn Running");
  });

  it("renders a compact non-clickable completed status", () => {
    const text = visibleText(html);
    expect(text).toContain("Race completed");
    expect(text).toContain("Results coming soon");
    const statusIndex = html.indexOf("Race completed");
    expect(html.slice(statusIndex - 200, statusIndex)).not.toContain("<a ");
  });

  it("keeps the reviewed secondary signposts", () => {
    const text = visibleText(html);
    expect(text).toContain("View TRA permit 8571");
    expect(text).toContain("Course map");
  });

  it("promotes a reviewed results destination when present", () => {
    const results: PublicDestination = {
      role: "results",
      roleLabel: "Results",
      provider: "Saturn Running",
      action: "View results",
      href: "https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932/results",
      host: "saturnrunning.co.uk",
      destinationRole: "official_information",
      linkType: "organiser-other",
    };
    const out = renderToStaticMarkup(
      <DestinationPanel destinations={[...buildPilotDestinations(DUCKY_ROW), results]} isPast />,
    );
    expect(visibleText(out)).toContain("Race results");
    expect(out).toContain(results.href);
    expect(visibleText(out)).not.toContain("Results coming soon");
  });
});

describe("DestinationPanel analytics callback", () => {
  it("passes the unchanged reviewed destinations to onSelect targets", () => {
    const destinations = buildPilotDestinations(SEDGEFIELD_ROW);
    expect(destinations.map((d) => [d.role, d.destinationRole, d.linkType])).toEqual([
      ["entry", "booking_destination", "entry"],
      ["official_details", "official_information", "organiser-other"],
      ["governing_listing", "official_information", "organiser-other"],
      ["athlete_information", "official_information", "organiser-other"],
      ["course", "official_information", "organiser-other"],
    ]);
  });
});
