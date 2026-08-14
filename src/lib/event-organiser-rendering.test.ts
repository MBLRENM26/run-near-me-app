import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEventCtas } from "@/lib/event-ctas";
import { hasMeaningfulOrganiser } from "@/lib/event-indexability";

const SOURCE = readFileSync(
  resolve(process.cwd(), "src/routes/events.$slug.tsx"),
  "utf8",
);

describe("organiser rendering without a trusted CTA", () => {
  it("has no trusted CTA when entry_url is an aggregator and organiser_url is null", () => {
    const ctas = buildEventCtas(
      {
        entry_url: "https://www.runabc.co.uk/some-listing",
        organiser_url: null,
      },
      { isPast: false, proximity: null },
    );
    expect(ctas).toBeNull();
  });

  it("still treats the reviewed organiser fact as displayable", () => {
    expect(hasMeaningfulOrganiser("Yeovil Town RRC")).toBe(true);
  });

  it("renders <OrganiserLine> outside the primary-CTA block", () => {
    const ctaIndex = SOURCE.indexOf("{primaryCta && (");
    const noCtaIndex = SOURCE.indexOf("{!primaryCta && (");
    expect(noCtaIndex).toBeGreaterThan(-1);
    expect(ctaIndex).toBeGreaterThan(-1);
    // The CTA-less branch must come first and must render the organiser line.
    expect(noCtaIndex).toBeLessThan(ctaIndex);
    const noCtaBlock = SOURCE.slice(noCtaIndex, ctaIndex);
    expect(noCtaBlock).toContain("<OrganiserLine");
  });

  it("renders the organiser line exactly twice (mutually exclusive branches)", () => {
    const occurrences = SOURCE.split("<OrganiserLine").length - 1;
    expect(occurrences).toBe(2);
  });

  it("never renders an external link from the organiser line", () => {
    const start = SOURCE.indexOf("function OrganiserLine(");
    expect(start).toBeGreaterThan(-1);
    const body = SOURCE.slice(start, start + 1200);
    expect(body).not.toContain("href=");
    expect(body).not.toContain("entry_url");
  });
});
