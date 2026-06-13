// Generates the "About this race" paragraph for event pages.
//
// ACCURACY RULE: every clause is built only from stable structured fields
// (name, distance bucket, town, county, region, date) plus a live database
// count. No scraped fee, no organiser, no invented copy — a sentence is
// dropped entirely when its field is missing.

import { formatEventDate, eventProximity } from "./date";
import { classifyEventLink } from "./link-trust";
import type { DistanceKey } from "./distance-filters";

/** "a half marathon", "an ultra marathon", "a 10K race" — with article. */
export function distanceSingular(key: DistanceKey): string {
  switch (key) {
    case "5k":
      return "a 5K race";
    case "10k":
      return "a 10K race";
    case "half-marathon":
      return "a half marathon";
    case "marathon":
      return "a marathon";
    case "trail":
      return "a trail race";
    case "ultra":
      return "an ultra marathon";
  }
}

/** "half marathons", "10K races" — for counts and headings. */
export function distancePlural(key: DistanceKey): string {
  switch (key) {
    case "5k":
      return "5K races";
    case "10k":
      return "10K races";
    case "half-marathon":
      return "half marathons";
    case "marathon":
      return "marathons";
    case "trail":
      return "trail races";
    case "ultra":
      return "ultra marathons";
  }
}

/** Deterministic small hash so adjacent pages get different phrasings. */
function slugVariant(slug: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9973;
  return h % mod;
}

export type AboutEventInput = {
  slug: string;
  name: string;
  town: string | null;
  county: string | null;
  region: string | null;
  date_from?: string | null;
  date_to?: string | null;
  sort_date?: string | null;
  date_raw?: string | null;
  date_is_estimated?: boolean | null;
  distanceKey: DistanceKey | null;
  hasOfficialLink: boolean;
  /** Live count of same-distance (or all, when unbucketed) upcoming events in the region. */
  regionCount: number;
};

/** Only mention the count when it reads as a meaningful number. */
const MIN_COUNT_FOR_MENTION = 5;

export type AboutParagraph = {
  /** Sentence 1 + optional sentence 2, joined. Always plain text. */
  intro: string;
  /** Sentence 3 split so the count phrase can be rendered as a link. */
  count: {
    before: string;
    linkText: string;
    after: string;
  } | null;
};

export function buildAboutParagraph(e: AboutEventInput): AboutParagraph | null {
  if (!e.name?.trim()) return null;
  const v = slugVariant(e.slug, 3);

  const name = e.name.trim();
  const subject = /^the\s/i.test(name) ? name : `The ${name}`;
  const what = e.distanceKey ? distanceSingular(e.distanceKey) : "a running event";
  const sameTownCounty =
    e.town && e.county && e.town.trim().toLowerCase() === e.county.trim().toLowerCase();
  const loc = (sameTownCounty ? [e.town] : [e.town, e.county])
    .filter(Boolean)
    .join(", ");

  // Date clause — estimated dates are never shown as a precise day.
  const dateLabel = formatEventDate(e);
  let dateClause = "";
  if (dateLabel) {
    if (e.date_is_estimated) {
      const month = dateLabel.replace(" (date TBC)", "");
      dateClause = `, expected in ${month} with the exact date still to be confirmed`;
    } else {
      dateClause =
        v === 1 ? ` on ${dateLabel}` : `, taking place on ${dateLabel}`;
    }
  }

  // Sentence 1 — name, distance, location, date.
  let s1: string;
  if (v === 0) {
    s1 = `${subject} is ${what}${loc ? ` in ${loc}` : ""}${dateClause}.`;
  } else if (v === 1) {
    s1 = `${subject} is ${what}${loc ? ` held in ${loc}` : ""}${dateClause}.`;
  } else {
    s1 = `${subject} is ${what}${loc ? ` based in ${loc}` : ""}${dateClause}.`;
  }

  // Sentence 2 — entry pointer. Never a price claim.
  let s2 = "";
  if (e.hasOfficialLink) {
    s2 =
      v === 1
        ? "For entry details and current pricing, head to the official event website."
        : "Entry details and pricing are available on the official event website.";
  }

  // Sentence 3 — live regional count, split so the count phrase is linkable.
  let count: AboutParagraph["count"] = null;
  if (e.region && e.regionCount >= MIN_COUNT_FOR_MENTION) {
    const plural = e.distanceKey
      ? distancePlural(e.distanceKey)
      : "running events";
    const n = e.regionCount.toLocaleString();
    const linkText = `${n} ${plural} in ${e.region}`;
    if (v === 0) {
      count = {
        before: "It's one of ",
        linkText,
        after: " this season — find more below.",
      };
    } else if (v === 1) {
      count = {
        before: "It's among ",
        linkText,
        after: " happening this season — see more below.",
      };
    } else {
      count = {
        before: "There are ",
        linkText,
        after: " coming up this season — explore more below.",
      };
    }
  }

  return { intro: [s1, s2].filter(Boolean).join(" "), count };
}

// ---------------------------------------------------------------------------
// Event Q&A block
//
// Field-driven, trust-strict Q&As surfaced as a visible accordion AND a
// matching FAQPage JSON-LD block. Both consumers use this same helper, so
// the visible text and the schema can never drift.
//
// Rules (per mem://constraints/scraped-data-trust):
// - Only ever restates structured fields we already trust.
// - Skip any individual Q whose source field is missing/unsafe.
// - Caller should skip the whole block when fewer than 2 Qs remain.
// - Never asserts price, organiser identity, or "official" status.
// - Entry wording is deliberately cautious: we do not claim the link is the
//   organiser's official entry page, only that it is the linked entry page.
// ---------------------------------------------------------------------------

export type EventFaqInput = {
  name: string;
  date_from?: string | null;
  date_to?: string | null;
  sort_date?: string | null;
  date_raw?: string | null;
  date_is_estimated?: boolean | null;
  town: string | null;
  county: string | null;
  distances: string | null;
  entry_url: string | null;
  organiser_url: string | null;
};

export type EventFaq = { q: string; a: string };

export function buildEventFaqs(e: EventFaqInput): EventFaq[] {
  const faqs: EventFaq[] = [];
  const name = e.name?.trim();
  if (!name) return faqs;

  // 1. When — only for confirmed (non-estimated) dates with a real day.
  if (!e.date_is_estimated) {
    const dateLabel = formatEventDate(e);
    if (dateLabel && !/\(date TBC\)/i.test(dateLabel)) {
      faqs.push({
        q: `When is ${name}?`,
        a: `${name} takes place on ${dateLabel}.`,
      });
    }
  }

  // 2. Where — needs at least a town.
  const town = e.town?.trim();
  if (town) {
    const county = e.county?.trim();
    const sameTownCounty =
      !!county && town.toLowerCase() === county.toLowerCase();
    const loc = !county || sameTownCounty ? town : `${town}, ${county}`;
    faqs.push({
      q: `Where does ${name} take place?`,
      a: `${name} is held in ${loc}.`,
    });
  }

  // 3. Distance — needs the raw distances string from the listing.
  const distances = e.distances?.trim();
  if (distances) {
    faqs.push({
      q: `How far is ${name}?`,
      a: `${name} offers ${distances}.`,
    });
  }

  // 4. Entry / details — wording strictly follows link-trust classification.
  //    "entry" → event-specific page on a trusted host → entry wording.
  //    "organiser-site" (or organiser_url falling back the same way) →
  //    safer "more about" wording, never claiming it's an entry page.
  //    Untrusted / invalid → no question at all.
  const entry = classifyEventLink(e.entry_url);
  const org = classifyEventLink(e.organiser_url);
  if (entry.kind === "entry") {
    faqs.push({
      q: `How do I enter ${name}?`,
      a: "Entry information is available via the linked entry page where provided.",
    });
  } else if (
    entry.kind === "organiser-site" ||
    org.kind === "entry" ||
    org.kind === "organiser-site"
  ) {
    faqs.push({
      q: `Where can I find more about ${name}?`,
      a: "Event details are available via the linked organiser website where provided.",
    });
  }

  return faqs;
}

/** "June 2026" — for the visible "Listing added" footer line. */
export function formatListingAdded(
  norm_created_at: string | null | undefined,
  created_at: string | null | undefined,
): string | null {
  const src = norm_created_at ?? created_at;
  if (!src) return null;
  const dt = new Date(src);
  if (isNaN(dt.getTime())) return null;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/** ISO date (YYYY-MM-DD) for schema.org datePublished. */
export function listingPublishedISO(
  norm_created_at: string | null | undefined,
  created_at: string | null | undefined,
): string | null {
  const src = norm_created_at ?? created_at;
  if (!src) return null;
  const dt = new Date(src);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

