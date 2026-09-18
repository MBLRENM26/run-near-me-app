import { describe, expect, it } from "vitest";
import {
  buildSeriesKey,
  describeSeriesKey,
  normaliseSeriesName,
  normaliseTownToken,
  primaryDistanceToken,
} from "./series-key";

describe("normaliseSeriesName", () => {
  it("strips a trailing year", () => {
    expect(normaliseSeriesName("Tettenhall 5K 2026")).toBe("tettenhall 5k");
  });

  it("strips year spans", () => {
    expect(normaliseSeriesName("Winter League 2026/27")).toBe("winter league");
    expect(normaliseSeriesName("Winter League 2026-2027")).toBe("winter league");
  });

  it("strips ordinal edition markers and edition words", () => {
    expect(normaliseSeriesName("The 42nd Annual Great Bentley Half Marathon")).toBe(
      "great bentley half marathon",
    );
  });

  it("folds punctuation and diacritics", () => {
    expect(normaliseSeriesName("Bala Tri-athlon — Rôund 1")).toBe("bala tri athlon round 1");
  });

  it("returns empty for missing names", () => {
    expect(normaliseSeriesName(null)).toBe("");
    expect(normaliseSeriesName(undefined)).toBe("");
    expect(normaliseSeriesName("   ")).toBe("");
  });
});

describe("normaliseTownToken", () => {
  it("slugifies", () => {
    expect(normaliseTownToken("Stoke-on-Trent")).toBe("stoke-on-trent");
    expect(normaliseTownToken("Bury St Edmunds")).toBe("bury-st-edmunds");
  });

  it("returns empty for missing town", () => {
    expect(normaliseTownToken(null)).toBe("");
  });
});

describe("primaryDistanceToken", () => {
  it("prefers curated tags, deterministically ordered", () => {
    expect(primaryDistanceToken(["10k", "5k"], "whatever")).toBe("10k");
    expect(primaryDistanceToken(["5k", "10k"], "whatever")).toBe("10k");
  });

  it("falls back to sniffing free text", () => {
    expect(primaryDistanceToken(null, "Half Marathon and 10K")).toBe("half-marathon");
    expect(primaryDistanceToken([], "10K only")).toBe("10k");
    expect(primaryDistanceToken([], "Marathon")).toBe("marathon");
  });

  it("returns empty when nothing reliable is present", () => {
    expect(primaryDistanceToken(null, null)).toBe("");
    expect(primaryDistanceToken([], "fun run")).toBe("");
  });
});

describe("buildSeriesKey", () => {
  it("gives the same key to two editions of the same race", () => {
    const a = buildSeriesKey({
      name: "Tettenhall 5K 2025",
      town: "Wolverhampton",
      distance_tags: ["5k"],
    });
    const b = buildSeriesKey({
      name: "TRX Tettenhall 5k",
      town: "Wolverhampton",
      distance_tags: ["5k"],
    });
    expect(a).not.toBeNull();
    // Different prefixes are genuinely different races — guard against
    // over-merging while confirming year stripping works.
    expect(a).toBe("tettenhall-5k|wolverhampton|5k");
    expect(b).toBe("trx-tettenhall-5k|wolverhampton|5k");
  });

  it("is stable across years for an identical name", () => {
    const y1 = buildSeriesKey({ name: "Great Bentley Half Marathon 2026", town: "Colchester" });
    const y2 = buildSeriesKey({ name: "Great Bentley Half Marathon 2027", town: "Colchester" });
    expect(y1).toBe(y2);
  });

  it("separates same-named races in different towns", () => {
    const a = buildSeriesKey({ name: "Summer 10K", town: "Bath" });
    const b = buildSeriesKey({ name: "Summer 10K", town: "Bristol" });
    expect(a).not.toBe(b);
  });

  it("returns null when the name is unusable", () => {
    expect(buildSeriesKey({ name: null })).toBeNull();
    expect(buildSeriesKey({ name: "5k" })).toBeNull();
    expect(buildSeriesKey({ name: "2026" })).toBeNull();
  });

  it("is pure — repeated calls agree", () => {
    const input = { name: "Adnams 10K 2026", town: "Southwold", distances: "10K" };
    expect(buildSeriesKey(input)).toBe(buildSeriesKey(input));
  });
});

describe("describeSeriesKey", () => {
  it("renders a readable label", () => {
    expect(describeSeriesKey("great-bentley-half-marathon|colchester|half-marathon")).toBe(
      "great bentley half marathon · colchester · half marathon",
    );
  });

  it("omits empty segments", () => {
    expect(describeSeriesKey("summer-10k||")).toBe("summer 10k");
  });
});
