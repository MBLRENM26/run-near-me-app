import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DestinationPanel } from "./DestinationPanel";
import { buildPilotDestinations } from "@/lib/pilot-destinations";

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

describe("DestinationPanel static SSR markup", () => {
  const html = render(SATURN_ROW);

  it("renders the labelled section heading", () => {
    expect(html).toContain('aria-labelledby="where-to-go-next"');
    expect(html).toContain("Where to go next");
  });

  it("shows role and provider before the click", () => {
    expect(html).toContain("Entry");
    expect(html).toContain("Saturn Running");
    expect(html).toContain("Licence");
    expect(html).toContain("Trail Running Association");
  });

  it("renders the approved actions and external-link semantics", () => {
    expect(html).toContain("View entry options");
    expect(html).toContain("View TRA permit 8570");
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

describe("DestinationPanel layouts", () => {
  it("renders the 2-destination layout with one primary and one secondary tile", () => {
    const html = render(SATURN_ROW);
    expect(html.split("<li").length - 1).toBe(1);
    expect(html).toContain("lg:w-[30%]");
    expect(html).toContain("sm:grid-cols-2");
  });

  it("renders the 3-destination layout (Rubber Ducky)", () => {
    const html = render(DUCKY_ROW);
    expect(html.split("<li").length - 1).toBe(2);
    expect(html).toContain("Enter event");
    expect(html).toContain("View approved TRA permit 8571");
    expect(html).toContain("View course map");
  });

  it("renders the 5-destination layout (Sedgefield) without licence wording", () => {
    const html = render(SEDGEFIELD_ROW);
    expect(html.split("<li").length - 1).toBe(4);
    expect(html).toContain("Governing-body listing");
    expect(html).toContain("Read 2026 athlete information");
    expect(html).toContain("View 2026 course map");
    expect(html).not.toContain("Licence");
    expect(html).not.toContain("Approved");
  });

  it("renders the 4-destination Hertfordshire layout without private provenance", () => {
    const html = render(HERTS_ROW);
    expect(html.split("<li").length - 1).toBe(3);
    expect(html).toContain("View Half Marathon course");
    expect(html).toContain("View 10K course");
    expect(html).not.toContain("runabc");
  });
});

describe("DestinationPanel post-race state", () => {
  const html = render(DUCKY_ROW, true);

  it("suppresses the entry anchor", () => {
    expect(html).not.toContain("https://www.saturnrunning.co.uk/e/the-rubber-ducky-waddle-14932\"");
    expect(html).not.toContain("Enter event");
  });

  it("renders a non-clickable completed status", () => {
    expect(html).toContain("Race completed");
    expect(html).toContain("Results coming soon");
    const statusIndex = html.indexOf("Race completed");
    expect(html.slice(statusIndex - 200, statusIndex)).not.toContain("<a ");
  });

  it("keeps the reviewed secondary destinations", () => {
    expect(html).toContain("View approved TRA permit 8571");
    expect(html).toContain("View course map");
  });
});
