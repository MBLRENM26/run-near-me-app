/**
 * Per-event indexability rule. Returns whether an event detail page
 * should be allowed in search engine indexes, plus a short reason
 * code for diagnostics.
 *
 * Background: Google was flagging 323 `/events/{slug}` pages as soft
 * 404 — overwhelmingly templated recurring-series instances ("Race
 * for Life — {city}", "Pretty Muddy — {city}", "Trunce Series Race
 * 6/7/8…"). Pages exist for direct visitors but should not all be
 * indexed individually.
 *
 * Rules (any one triggers noindex):
 *  - Past — race already happened. Page stays live but stops asking
 *    Google to keep it as a candidate result.
 *  - Slug-suffix duplicate — a `-race-N` suffix is a near-certain
 *    templated series copy.
 *  - Orphan — no entry url, no organiser url, no organiser name.
 *    Nothing on the page beyond the structured fields.
 *  - Duplicate sibling — ≥2 ACTIVE events share the normalised name,
 *    AND this is NOT the earliest upcoming instance. The earliest
 *    instance stays indexable so brand queries land somewhere.
 */

const MONTH_PATTERN =
  "(january|february|march|april|may|june|july|august|september|october|november|december)";

// Only `-race-N` is a near-certain templated series member. A trailing
// month name is NOT: 82 future singleton events ("Rock Up 'n' Run Bingley
// August", "Thurlby 10K … September") were noindexed by that clause with
// no duplicate at all. Genuine month-suffixed series are still caught by
// the duplicate-sibling rule below, which normalises month names out of
// the event name before grouping.
const SLUG_SUFFIX_DUPLICATE_RE = /-race-\d+$/i;

const NAME_NORMALISE_STRIP = new RegExp(
  // Strip trailing year (2024…2099), month names, and "race N" tokens
  // wherever they appear in the name — they're the per-instance suffix
  // that distinguishes series members.
  `\\b(20\\d{2}|${MONTH_PATTERN}|race\\s*\\d+)\\b`,
  "gi",
);

/** Lowercased, punctuation-stripped, series-suffix-stripped name. */
export function normaliseEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[–—]/g, "-") // unify dashes
    .replace(NAME_NORMALISE_STRIP, " ")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the slug ends with `-race-N` or a `-{month}` suffix. */
export function slugIsSuffixDuplicate(slug: string): boolean {
  return SLUG_SUFFIX_DUPLICATE_RE.test(slug);
}

/**
 * Series stem: drops the last hyphen segment from slugs with ≥3
 * segments. Catches city-suffix and date-suffix series the name
 * normaliser misses (`race-for-life-{city}`, `pretty-muddy-{city}`,
 * `holme-pierrepont-grand-prix-race-N`). Returns null when the slug
 * is too short to safely strip.
 */
export function slugStem(slug: string): string | null {
  const parts = slug.split("-");
  if (parts.length < 3) return null;
  return parts.slice(0, -1).join("-");
}

export type IndexabilityInput = {
  id: string;
  slug: string;
  name: string;
  sort_date: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  organiser: string | null;
};

/**
 * Sibling rows must carry the same fields as the subject so eligibility can
 * be evaluated consistently on both the per-page and sitemap surfaces.
 */
export type SiblingEvent = IndexabilityInput;

export type IndexabilityResult = {
  indexable: boolean;
  reason: null | "past" | "slug-suffix-duplicate" | "orphan" | "duplicate-sibling";
};

/**
 * Placeholder organiser values that carry no identity ("TBC", "tbc ",
 * "T.B.C." etc). Treated as no organiser at all.
 */
const PLACEHOLDER_ORGANISERS = new Set([
  "tbc",
  "t.b.c.",
  "tba",
  "t.b.a.",
  "n/a",
  "na",
  "unknown",
  "-",
]);

/** True when `organiser` is a real, displayable organiser name. */
export function hasMeaningfulOrganiser(organiser: string | null | undefined): boolean {
  const trimmed = (organiser ?? "").trim();
  if (trimmed.length === 0) return false;
  return !PLACEHOLDER_ORGANISERS.has(trimmed.toLowerCase());
}

/**
 * Intrinsic (sibling-independent) noindex reason for a row, or null when the
 * row is a genuine candidate. Used both by `computeIndexability` and by the
 * sibling-eligibility filter so a placeholder-only/orphan or intrinsically
 * noindex row cannot suppress an evidence-backed occurrence.
 */
export function intrinsicNoindexReason(
  event: IndexabilityInput,
  todayIso: string,
): Exclude<IndexabilityResult["reason"], null | "duplicate-sibling"> | null {
  if (event.sort_date && event.sort_date < todayIso) return "past";
  if (slugIsSuffixDuplicate(event.slug)) return "slug-suffix-duplicate";
  const hasLink = !!(event.entry_url?.trim() || event.organiser_url?.trim());
  if (!hasLink && !hasMeaningfulOrganiser(event.organiser)) return "orphan";
  return null;
}

/** A sibling may only compete for the canonical slot when it is itself eligible. */
export function isEligibleSibling(sibling: SiblingEvent, todayIso: string): boolean {
  return intrinsicNoindexReason(sibling, todayIso) === null;
}

/**
 * `siblings` should be ACTIVE events (including the current one) whose
 * normalised name equals the current event's normalised name. The
 * caller is responsible for the normalisation match — this function
 * only decides earliest-upcoming among *eligible* siblings.
 *
 * `todayIso` is YYYY-MM-DD UTC. Past = strictly before today.
 */
export function computeIndexability(
  event: IndexabilityInput,
  siblings: SiblingEvent[],
  todayIso: string,
): IndexabilityResult {
  const intrinsic = intrinsicNoindexReason(event, todayIso);
  if (intrinsic) return { indexable: false, reason: intrinsic };

  // Only siblings that could themselves be canonical count. Placeholder-only
  // / orphan / past / slug-suffix-duplicate rows never shadow a real page.
  const eligible = siblings.filter((s) => s.id === event.id || isEligibleSibling(s, todayIso));
  if (eligible.length >= 2) {
    const future = eligible
      .filter((s) => s.sort_date && s.sort_date >= todayIso)
      .sort((a, b) => (a.sort_date! < b.sort_date! ? -1 : 1));
    const earliest = future[0];
    if (earliest && earliest.id !== event.id) {
      return { indexable: false, reason: "duplicate-sibling" };
    }
  }
  return { indexable: true, reason: null };
}
