import { describe, expect, it } from "vitest";
import { buildAboutParagraph } from "./event-description";
import { primaryDistanceKeyFromTags } from "./event-tags";

describe("race descriptions versus broad navigation categories", () => {
  it.each(["multi-terrain", "fell"])("does not describe a %s 10K as a trail race", (terrain) => {
    const distanceKey = primaryDistanceKeyFromTags(["10k"], [terrain]);
    const descriptionDistanceKey = primaryDistanceKeyFromTags(["10k"], []);
    const paragraph = buildAboutParagraph({
      slug: "hot-chocolate", name: "Hot Chocolate", town: "Edinburgh", county: null,
      region: "Scotland", distanceKey, descriptionDistanceKey,
      hasOfficialLink: true, regionCount: 64,
    });
    expect(distanceKey).toBe("trail");
    expect(paragraph?.intro).toContain("a 10K race");
    expect(paragraph?.intro).not.toContain("a trail race");
    expect(paragraph?.count?.linkText).toBe("64 trail and off-road races in Scotland");
  });

  it("does not infer terrain from a broad category when the factual distance is unknown", () => {
    const paragraph = buildAboutParagraph({
      slug: "fell-event", name: "Fell Event", town: null, county: null, region: null,
      distanceKey: "trail", descriptionDistanceKey: null, hasOfficialLink: false, regionCount: 0,
    });
    expect(paragraph?.intro).toContain("a running event");
    expect(paragraph?.intro).not.toContain("trail");
  });
});
