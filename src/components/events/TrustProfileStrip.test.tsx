import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustProfileStrip } from "./TrustProfileStrip";
import { governanceDisplay, isLicensedTrue } from "@/lib/event-taxonomy";

const TRUST_TONE = "bg-primary/10";
const NEUTRAL_TONE = "bg-muted/60";

function render(props: {
  governance: string | null;
  licensed?: string | null;
  organiser_type?: string | null;
  race_profile?: string | null;
}) {
  return renderToStaticMarkup(
    <TrustProfileStrip
      governance={props.governance}
      licensed={props.licensed ?? null}
      organiser_type={props.organiser_type ?? null}
      race_profile={props.race_profile ?? null}
    />,
  );
}

describe("governanceDisplay state awareness", () => {
  it("FNUL: england_athletics with null licensed is neutral association context", () => {
    expect(governanceDisplay("england_athletics", null)).toEqual({
      label: "England Athletics",
      permitted: false,
    });
  });

  it("Sedgefield: england_athletics + 'true' asserts a permit", () => {
    expect(governanceDisplay("england_athletics", "true")).toEqual({
      label: "England Athletics permitted",
      permitted: true,
    });
  });

  it("Rubber Ducky: tra + 'true' uses the TRA acronym", () => {
    expect(governanceDisplay("tra", "true")).toEqual({
      label: "TRA permitted",
      permitted: true,
    });
  });

  it("Hertfordshire: unknown governance renders no badge whatever licensed says", () => {
    expect(governanceDisplay("unknown", null).label).toBeNull();
    expect(governanceDisplay("unknown", "true").label).toBeNull();
    expect(governanceDisplay(null, "true").label).toBeNull();
  });

  it("accepts only a trimmed, case-insensitive exact 'true'", () => {
    expect(isLicensedTrue(" TRUE ")).toBe(true);
    expect(governanceDisplay("tra", " True ").permitted).toBe(true);
    for (const value of [
      null,
      undefined,
      "",
      "false",
      "FALSE",
      "unknown",
      "true-ish",
      "1",
      "yes",
    ]) {
      expect(governanceDisplay("tra", value).permitted).toBe(false);
      expect(governanceDisplay("tra", value).label).toBe("Trail Running Association");
    }
  });

  it("legacy free-text licensed values fail closed", () => {
    const display = governanceDisplay("england_athletics", "UKA licence 31079");
    expect(display).toEqual({ label: "England Athletics", permitted: false });
  });

  it("preserves parkrun and unlicensed semantics", () => {
    expect(governanceDisplay("parkrun", null).label).toBe("parkrun event");
    expect(governanceDisplay("unlicensed", "true")).toEqual({
      label: "Unlicensed",
      permitted: false,
    });
  });
});

describe("TrustProfileStrip rendering", () => {
  it("renders neutral association badge for FNUL", () => {
    const html = render({ governance: "england_athletics", licensed: null });
    expect(html).toContain("England Athletics");
    expect(html).not.toContain("permitted");
    expect(html).toContain(NEUTRAL_TONE);
    expect(html).not.toContain(TRUST_TONE);
  });

  it("renders trust-toned permit badge for Sedgefield", () => {
    const html = render({ governance: "england_athletics", licensed: "true" });
    expect(html).toContain("England Athletics permitted");
    expect(html).toContain(TRUST_TONE);
  });

  it("renders trust-toned TRA permit badge for Rubber Ducky", () => {
    const html = render({ governance: "tra", licensed: "true" });
    expect(html).toContain("TRA permitted");
    expect(html).toContain(TRUST_TONE);
  });

  it("renders no governance badge for Hertfordshire (unknown)", () => {
    const html = render({
      governance: "unknown",
      licensed: null,
      organiser_type: "commercial",
    });
    expect(html).not.toContain("England Athletics");
    expect(html).not.toContain("permitted");
    expect(html).toContain("Commercial event");
  });

  it("never leaks a raw licensed value and never claims permitted when false", () => {
    const falseHtml = render({ governance: "england_athletics", licensed: "false" });
    expect(falseHtml).not.toContain("permitted");
    expect(falseHtml).not.toContain("false");

    const legacyHtml = render({
      governance: "england_athletics",
      licensed: "UKA licence 31079",
    });
    expect(legacyHtml).not.toContain("31079");
    expect(legacyHtml).not.toContain("UKA");
    expect(legacyHtml).not.toContain("permitted");
    expect(legacyHtml).toContain("England Athletics");
  });

  it("leaves organiser and race-profile badges unchanged", () => {
    const html = render({
      governance: null,
      licensed: null,
      organiser_type: "club",
      race_profile: "multi_terrain",
    });
    expect(html).toContain("Club-organised");
    expect(html).toContain("Multi-terrain");
  });

  it("renders nothing when no field has a display value", () => {
    expect(render({ governance: "unknown", licensed: "true" })).toBe("");
  });
});
