import { CURRENT_YEAR } from "./site";
import type { FAQ } from "./distance-filters";

/**
 * Landing pages for the Phase 2 taxonomy columns (governance / organiser_type).
 *
 * Each page is a hand-written config — the intro paragraph and FAQs are
 * stable prose about what the tag *means*, never scraped free-text about
 * individual events (respects mem://constraints/scraped-data-trust).
 *
 * Only ship a route if the trust-gated count clears ~20 upcoming events;
 * everything else stays out to avoid thin pages.
 */

export type TaxonomyField = "governance" | "organiser_type";

export interface TaxonomyPageConfig {
  slug: string;
  field: TaxonomyField;
  /** Enum value stored in the DB column. */
  value: string;
  label: string; // short label / nav pill
  h1: string;
  noun: string; // e.g. "England Athletics permitted race"
  nounPlural: string;
  intro: string;
  metaTitle: string;
  metaDescription: (total: number) => string;
  faqs: FAQ[];
}

function metaDesc(nounPlural: string) {
  return (total: number) =>
    `Browse ${total.toLocaleString()} upcoming ${nounPlural} across the UK in ${CURRENT_YEAR}. Dates, distances, entry links and venue details.`;
}

export const TAXONOMY_PAGES: TaxonomyPageConfig[] = [
  {
    slug: "england-athletics-permitted-races",
    field: "governance",
    value: "england_athletics",
    label: "England Athletics permitted",
    h1: `England Athletics Permitted Races ${CURRENT_YEAR}`,
    noun: "England Athletics permitted race",
    nounPlural: "England Athletics permitted races",
    intro:
      "Races run under an England Athletics permit are officially sanctioned events — the organiser has agreed to national rules on measurement, insurance, safety and race conduct. Look for the permit when you want a well-run, competitive race that counts for national rankings and club competitions.",
    metaTitle: `England Athletics Permitted Races ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: metaDesc("England Athletics permitted races"),
    faqs: [
      {
        q: "What does 'England Athletics permitted' mean?",
        a: "An England Athletics permit means the race has been formally sanctioned by the national governing body for the sport. The organiser agrees to national rules on course measurement, safety, insurance and race conduct, and the event is eligible for national rankings.",
      },
      {
        q: "Are permitted races better than unlicensed events?",
        a: "'Better' depends on what you want. Permitted races are held to a known standard, are usually accurately measured, and count towards Power of 10 rankings and club competitions. Unlicensed events can still be well-run and enjoyable, but the standard is not independently verified.",
      },
      {
        q: "Do I need to be a club member to enter?",
        a: "No. Most permitted races accept unaffiliated runners, though affiliated (club) members often pay a few pounds less, because part of the unaffiliated fee goes back to England Athletics.",
      },
      {
        q: "Where do results appear?",
        a: "Results from permitted road and track races are uploaded to Power of 10 (thepowerof10.info) where they contribute to your ranking and personal best history.",
      },
    ],
  },
  {
    slug: "tra-permitted-races",
    field: "governance",
    value: "tra",
    label: "TRA permitted",
    h1: `Trail Running Association (TRA) Permitted Races ${CURRENT_YEAR}`,
    noun: "TRA permitted trail race",
    nounPlural: "TRA permitted trail races",
    intro:
      "The Trail Running Association (TRA) is the UK governing body for trail running. TRA-permitted races follow national rules on route marking, safety, kit and organiser standards — the mark of a well-organised off-road event.",
    metaTitle: `TRA Permitted Trail Races ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: metaDesc("TRA permitted trail races"),
    faqs: [
      {
        q: "What is the TRA?",
        a: "The Trail Running Association is the UK governing body for trail running, recognised by UK Athletics. It sets national standards for off-road racing including safety, route marking, kit and organiser requirements.",
      },
      {
        q: "Why enter a TRA-permitted race?",
        a: "TRA-permitted races give you confidence the event is well-marked, safety-planned and insured. Organisers commit to national standards — the same expectations apply whether you're running 10 km or 100 miles.",
      },
      {
        q: "Do I need to be a TRA member to enter?",
        a: "No. Anyone can enter a TRA-permitted race. TRA members typically pay a small discount on entry fees, similar to the club/unaffiliated distinction on road races.",
      },
      {
        q: "What kit is required for a TRA race?",
        a: "Kit lists vary by distance and terrain. Shorter, low-level races may only require basic clothing; longer mountain and moorland races typically require waterproof jacket and trousers, hat, gloves, food, water, whistle, and map. Always check the event's own kit list.",
      },
    ],
  },
  {
    slug: "club-organised-races",
    field: "organiser_type",
    value: "club",
    label: "Club-organised",
    h1: `Club-Organised Races in the UK ${CURRENT_YEAR}`,
    noun: "club-organised race",
    nounPlural: "club-organised races",
    intro:
      "Races put on by local running clubs — the backbone of UK racing. Club-organised events tend to be well-priced, honest courses, volunteer-marshalled, and part of a bigger community. Perfect if you want a straightforward, no-frills race with the money going back into the sport.",
    metaTitle: `Club-Organised Races in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: metaDesc("club-organised races"),
    faqs: [
      {
        q: "What makes a club-organised race different?",
        a: "Club races are put on by volunteers from a local running club rather than a commercial event company. Entry fees are usually lower, courses are often accurately measured local routes, and profits go back to the club — funding coaching, juniors and facilities.",
      },
      {
        q: "Can non-members enter club races?",
        a: "Yes, almost always. Some club-organised races are 'closed' (members-only) but the majority are open to any runner. Affiliated (club) members typically get a small discount on the entry fee.",
      },
      {
        q: "Are club-organised races beginner friendly?",
        a: "Very much so. Club races tend to be small, welcoming and low-key. You'll often see a mix of first-timers, club regulars and competitive runners on the same start line.",
      },
      {
        q: "How do I find a running club near me?",
        a: "Use our running clubs directory to find affiliated clubs by area. Most clubs welcome visitors to training sessions and can point you to their next open race.",
      },
    ],
  },
];

export function taxonomyPageBySlug(slug: string): TaxonomyPageConfig | null {
  return TAXONOMY_PAGES.find((p) => p.slug === slug) ?? null;
}
