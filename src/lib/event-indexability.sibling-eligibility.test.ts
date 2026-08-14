import { describe, it, expect } from "vitest";
import {
  computeIndexability,
  hasMeaningfulOrganiser,
  isEligibleSibling,
  intrinsicNoindexReason,
  normaliseEventName,
  type IndexabilityInput,
} from "@/lib/event-indexability";

const TODAY = "2026-08-14";

function ev(o: Partial<IndexabilityInput> & { id: string }): IndexabilityInput {
  return {
    slug: `slug-${o.id}`,
    name: "Regents Park 5K & 10K",
    sort_date: "2026-11-01",
    entry_url: "https://example-organiser.co.uk/enter",
    organiser_url: null,
    organiser: "Example Race Co",
    ...o,
  };
}

describe("hasMeaningfulOrganiser", () => {
  it("accepts real organiser names", () => {
    expect(hasMeaningfulOrganiser("Yeovil Town RRC")).toBe(true);
  });

  it("rejects empty and nullish values", () => {
    expect(hasMeaningfulOrganiser(null)).toBe(false);
    expect(hasMeaningfulOrganiser(undefined)).toBe(false);
    expect(hasMeaningfulOrganiser("   ")).toBe(false);
  });

  it("rejects TBC placeholders regardless of case or whitespace", () => {
    for (const v of [" TBC", "tbc ", "Tbc", "T.B.C.", "TBA", "n/a", "unknown", "-"]) {
      expect(hasMeaningfulOrganiser(v)).toBe(false);
    }
  });
});

describe("sibling eligibility", () => {
  const october = ev({
    id: "oct",
    slug: "regents-park-5k-10k-october",
    sort_date: "2026-10-04",
    organiser: "TBC",
    entry_url: null,
    organiser_url: null,
  });
  const november = ev({
    id: "nov",
    slug: "regents-park-5k-10k-november",
    sort_date: "2026-11-01",
    organiser: "Phoenix Running",
    entry_url: "https://phoenixrunning.co.uk/regents-park",
  });

  it("treats a placeholder-only orphan row as intrinsically noindex", () => {
    expect(intrinsicNoindexReason(october, TODAY)).toBe("orphan");
    expect(isEligibleSibling(october, TODAY)).toBe(false);
    expect(isEligibleSibling(november, TODAY)).toBe(true);
  });

  it("does not let an ineligible earlier sibling shadow an evidence-backed page", () => {
    expect(computeIndexability(november, [october, november], TODAY)).toEqual({
      indexable: true,
      reason: null,
    });
  });

  it("keeps earliest-upcoming among genuinely eligible siblings", () => {
    const eligibleOctober = ev({
      ...october,
      organiser: "Phoenix Running",
      entry_url: "https://phoenixrunning.co.uk/regents-park-october",
    });
    expect(computeIndexability(november, [eligibleOctober, november], TODAY).reason).toBe(
      "duplicate-sibling",
    );
    expect(computeIndexability(eligibleOctober, [eligibleOctober, november], TODAY).indexable).toBe(
      true,
    );
  });

  it("still noindexes rows that are themselves orphans or past", () => {
    expect(computeIndexability(october, [october], TODAY).reason).toBe("orphan");
    expect(computeIndexability(ev({ id: "past", sort_date: "2026-01-01" }), [], TODAY).reason).toBe(
      "past",
    );
  });

  it("keeps an organiser-only row (no links) indexable", () => {
    const ytrrc = ev({
      id: "ytrrc",
      slug: "ytrrc-5k-spring-summer-series-september",
      name: "YTRRC 5K Spring/Summer Series September",
      organiser: "Yeovil Town RRC",
      entry_url: null,
      organiser_url: null,
    });
    expect(intrinsicNoindexReason(ytrrc, TODAY)).toBeNull();
  });
});

describe("per-page / sitemap parity", () => {
  // Both surfaces group by normalised name and then call computeIndexability
  // with the full sibling rows. Simulate each surface over one cohort and
  // assert identical verdicts.
  const cohort: IndexabilityInput[] = [
    ev({
      id: "oct",
      slug: "regents-park-5k-10k-october",
      sort_date: "2026-10-04",
      organiser: "TBC",
      entry_url: null,
    }),
    ev({
      id: "nov",
      slug: "regents-park-5k-10k-november",
      sort_date: "2026-11-01",
      organiser: "Phoenix Running",
    }),
  ];

  function sitemapVerdicts() {
    const byName = new Map<string, IndexabilityInput[]>();
    for (const r of cohort) {
      const k = normaliseEventName(r.name);
      byName.set(k, [...(byName.get(k) ?? []), r]);
    }
    return cohort.map(
      (r) => computeIndexability(r, byName.get(normaliseEventName(r.name))!, TODAY).indexable,
    );
  }

  function perPageVerdicts() {
    return cohort.map((r) => {
      const siblings = cohort.filter(
        (s) => normaliseEventName(s.name) === normaliseEventName(r.name),
      );
      return computeIndexability(r, siblings, TODAY).indexable;
    });
  }

  it("agrees on every row", () => {
    expect(perPageVerdicts()).toEqual(sitemapVerdicts());
    expect(sitemapVerdicts()).toEqual([false, true]);
  });
});
