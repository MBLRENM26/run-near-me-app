import { CURRENT_YEAR } from "./site";

export type DistanceKey =
  | "5k"
  | "10k"
  | "half-marathon"
  | "marathon"
  | "trail"
  | "ultra";

export interface FAQ {
  q: string;
  a: string;
}

export interface DistancePageConfig {
  key: DistanceKey;
  slug: string; // URL path without leading slash
  label: string; // short label for nav pills
  h1: string;
  shortName: string; // e.g. "5K"
  intro: string; // one-line page intro
  metaTitle: string;
  metaDescription: (total: number) => string;
  // Inclusion / exclusion patterns (lowercased substrings) matched against
  // the free-text `distances` column.
  includes: string[];
  excludes: string[];
  faqs: FAQ[];
}

function defaultMetaDesc(name: string) {
  return (total: number) =>
    `Find ${total.toLocaleString()} upcoming ${name} across the UK in ${CURRENT_YEAR}. Browse by region, enter online or contact organisers directly.`;
}

export const DISTANCE_PAGES: Record<DistanceKey, DistancePageConfig> = {
  "5k": {
    key: "5k",
    slug: "5k-races",
    label: "5K",
    shortName: "5K",
    h1: `5K Races in the UK ${CURRENT_YEAR}`,
    intro:
      "5K is the most popular distance in UK running — perfect for first-timers and a regular fixture for seasoned racers chasing a PB.",
    metaTitle: `5K Races in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("5K races"),
    includes: ["5k", "5 km", "5km"],
    excludes: ["15k", "25k", "35k", "45k", "50k", "55k", "500"],
    faqs: [
      {
        q: "How long is a 5K race?",
        a: "A 5K is 5 kilometres, or 3.1 miles. Most runners complete one in 20 to 40 minutes, and walkers in 45 to 60 minutes.",
      },
      {
        q: "How much does a 5K race cost to enter in the UK?",
        a: "Entry fees for organised 5K races typically range from £8 to £20. Charity 5Ks may be free with a fundraising commitment, and parkrun is free every Saturday morning.",
      },
      {
        q: "What's a good 5K time for a beginner?",
        a: "A typical beginner finishes a 5K in 30 to 40 minutes. A sub-25 minute 5K is a solid intermediate target, and sub-20 is competitive at club level.",
      },
      {
        q: "Where can I find a 5K race near me?",
        a: "Use the homepage location finder to see 5K races within a chosen radius of your postcode. Every race shown links straight to the organiser or entry page.",
      },
    ],
  },
  "10k": {
    key: "10k",
    slug: "10k-races",
    label: "10K",
    shortName: "10K",
    h1: `10K Races in the UK ${CURRENT_YEAR}`,
    intro:
      "10K is the bridge distance — long enough to feel like a real test, short enough to race often. UK 10Ks run all year on roads, parks and trails.",
    metaTitle: `10K Races in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("10K races"),
    includes: ["10k", "10 km", "10km"],
    excludes: ["100k", "110k"],
    faqs: [
      {
        q: "How long is a 10K race?",
        a: "A 10K is 10 kilometres, or 6.2 miles. Most runners finish in 45 to 75 minutes depending on training and terrain.",
      },
      {
        q: "How much does a 10K race cost in the UK?",
        a: "Entry fees usually sit between £15 and £35. Bigger city events and chip-timed road 10Ks tend to be at the higher end; club-organised local races are cheaper.",
      },
      {
        q: "What's a good 10K time?",
        a: "Around 60 minutes is a typical recreational target. Sub-50 is a strong club time, and sub-40 is competitive in age-group racing.",
      },
      {
        q: "How should I train for my first 10K?",
        a: "Most first-timers train for 8 to 12 weeks, building from 20 minutes of running to a long run of 8 to 10 km. Run three to four times a week and include one longer effort.",
      },
    ],
  },
  "half-marathon": {
    key: "half-marathon",
    slug: "half-marathons",
    label: "Half marathon",
    shortName: "half marathon",
    h1: `Half Marathons in the UK ${CURRENT_YEAR}`,
    intro:
      "13.1 miles — the most popular long-distance race in the UK. From flat road PB courses to scenic coastal and trail routes.",
    metaTitle: `Half Marathons in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("half marathons"),
    includes: ["half marathon", "half-marathon", "halfmarathon"],
    excludes: [],
    faqs: [
      {
        q: "How long is a half marathon?",
        a: "A half marathon is 21.0975 kilometres, or 13.1 miles — exactly half the marathon distance. Most finishers cross the line in 1:45 to 2:30.",
      },
      {
        q: "How long does it take to train for a half marathon?",
        a: "Plan on 12 to 16 weeks of training if you can already run 5K comfortably. Build to a long run of 10 to 12 miles two weeks before race day.",
      },
      {
        q: "What's a good half marathon time?",
        a: "Around 2 hours is a typical recreational goal. Sub-1:45 is a solid club time, sub-1:30 is competitive, and sub-1:15 is elite age-group level.",
      },
      {
        q: "How much does a UK half marathon cost?",
        a: "Entry fees range from around £25 for small regional events up to £60+ for major city halves like the Great North Run or Royal Parks. Most fall in the £30 to £45 bracket.",
      },
    ],
  },
  marathon: {
    key: "marathon",
    slug: "marathons",
    label: "Marathon",
    shortName: "marathon",
    h1: `Marathons in the UK ${CURRENT_YEAR}`,
    intro:
      "26.2 miles — the iconic distance. From London and Manchester to scenic coastal and trail marathons across the UK.",
    metaTitle: `Marathons in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("marathons"),
    includes: ["marathon"],
    excludes: ["half", "ultra"],
    faqs: [
      {
        q: "How long is a marathon?",
        a: "A marathon is 42.195 kilometres, or 26.2 miles. Most finishers complete it in 3:30 to 5:30, with the world record under 2:01.",
      },
      {
        q: "How long does it take to train for a marathon?",
        a: "Most plans run 16 to 20 weeks and assume you can already run a half marathon. Expect to peak at a long run of 18 to 22 miles around three weeks before race day.",
      },
      {
        q: "What's a good marathon time?",
        a: "Sub-4 hours is the classic recreational milestone — roughly 9:10 per mile. Sub-3:30 is a strong club time and Boston-qualifying for most age groups starts around 3:00 to 3:30.",
      },
      {
        q: "How much does it cost to enter a UK marathon?",
        a: "Entry fees range from around £45 for smaller regional marathons to £100+ for major events like London or Manchester. Most fall between £55 and £80.",
      },
    ],
  },
  trail: {
    key: "trail",
    slug: "trail-running-events",
    label: "Trail",
    shortName: "trail race",
    h1: `Trail Running Events in the UK ${CURRENT_YEAR}`,
    intro:
      "Off-road races across UK fells, forests, moors and coast paths — from short multi-terrain events to long mountain races.",
    metaTitle: `Trail Running Events in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("trail running events"),
    includes: ["trail", "fell", "hill race", "multi-terrain", "multi terrain"],
    excludes: [],
    faqs: [
      {
        q: "What's the difference between trail running and road running?",
        a: "Trail running takes place off-road on paths, tracks, fells and mountains. Terrain is uneven, climbs and descents are steeper, and pace is generally slower per mile than road running.",
      },
      {
        q: "Do I need special trail running shoes?",
        a: "For occasional dry trails, road shoes are fine. For regular off-road running — especially fell, mud or technical terrain — trail shoes with aggressive lugs and a more protective sole are strongly recommended.",
      },
      {
        q: "What is a fell race?",
        a: "Fell racing is a UK-specific style of mountain running held on open hill and moorland. Routes are often unmarked, navigation may be required, and full kit (waterproofs, map, compass) is mandatory for longer events.",
      },
      {
        q: "How do I get started with trail running in the UK?",
        a: "Start with a local multi-terrain 5K or 10K to get used to uneven ground, then progress to longer trail races. Local fell-running clubs and Park Trail events are great entry points.",
      },
    ],
  },
  ultra: {
    key: "ultra",
    slug: "ultra-marathons",
    label: "Ultra",
    shortName: "ultra marathon",
    h1: `Ultra Marathons in the UK ${CURRENT_YEAR}`,
    intro:
      "Anything beyond 26.2 miles — from 50K introductions to 100-milers and multi-day races across UK mountains, coast and countryside.",
    metaTitle: `Ultra Marathons in the UK ${CURRENT_YEAR} — Running Events Near Me`,
    metaDescription: defaultMetaDesc("ultra marathons"),
    includes: ["ultra"],
    excludes: [],
    faqs: [
      {
        q: "What counts as an ultra marathon?",
        a: "Any running race longer than the standard marathon distance of 42.195 km (26.2 miles). Common ultra distances are 50K, 50 miles, 100K and 100 miles.",
      },
      {
        q: "What's the shortest ultra marathon distance?",
        a: "50 kilometres (31 miles) is the traditional entry-level ultra and a good first step from the marathon distance. Many UK 50Ks run on trail or canal-side routes.",
      },
      {
        q: "How long does it take to train for a 50K ultra?",
        a: "Most runners need 16 to 24 weeks if they already have marathon experience. Training focuses on time on feet rather than mileage, with long runs of 4 to 6 hours.",
      },
      {
        q: "Do UK ultras require mandatory kit?",
        a: "Yes — most ultras require waterproof jacket, hat, gloves, food, water, whistle and map. Mountain and longer events often add survival bag, head torch and spare layers. Always check the race-specific kit list.",
      },
    ],
  },
};

export const DISTANCE_PAGE_LIST: DistancePageConfig[] = [
  DISTANCE_PAGES["5k"],
  DISTANCE_PAGES["10k"],
  DISTANCE_PAGES["half-marathon"],
  DISTANCE_PAGES.marathon,
  DISTANCE_PAGES.trail,
  DISTANCE_PAGES.ultra,
];

/**
 * Apply distance matcher to a single `distances` free-text value.
 * Lowercases once, then checks include / exclude substring lists.
 */
export function matchesDistance(
  distances: string | null | undefined,
  cfg: DistancePageConfig,
): boolean {
  if (!distances) return false;
  const s = distances.toLowerCase();
  for (const ex of cfg.excludes) {
    if (s.includes(ex)) return false;
  }
  for (const inc of cfg.includes) {
    if (s.includes(inc)) return true;
  }
  return false;
}

/**
 * Map an event's distances string to one canonical distance key (or null).
 * Used for the "More {distance} races" link on event detail pages.
 */
export function primaryDistanceKey(
  distances: string | null | undefined,
): DistanceKey | null {
  if (!distances) return null;
  // Prefer specific matches over generic "marathon" (which excludes half/ultra).
  for (const cfg of [
    DISTANCE_PAGES.ultra,
    DISTANCE_PAGES["half-marathon"],
    DISTANCE_PAGES.marathon,
    DISTANCE_PAGES.trail,
    DISTANCE_PAGES["10k"],
    DISTANCE_PAGES["5k"],
  ]) {
    if (matchesDistance(distances, cfg)) return cfg.key;
  }
  return null;
}
