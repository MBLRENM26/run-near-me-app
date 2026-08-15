import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DestinationPanel } from "./DestinationPanel";
import { buildPilotDestinations } from "@/lib/pilot-destinations";

const SATURN_ROW = {
  id: "adb1a4f8-504d-44bd-99d0-94d8b6346542",
  organiser: "Saturn Running",
  organiser_url: "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  entry_url: "https://www.saturnrunning.co.uk/e/im-not-throwing-away-my-shot-run-14793",
  source: "tra",
  source_url: "https://races.tra-uk.org/race-directory/view/7708",
  governance: "tra",
};

describe("DestinationPanel static SSR markup", () => {
  const html = renderToStaticMarkup(
    <DestinationPanel destinations={buildPilotDestinations(SATURN_ROW)} />,
  );

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
