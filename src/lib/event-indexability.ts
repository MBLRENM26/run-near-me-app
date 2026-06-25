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
 *  - Slug-suffix duplicate — `-race-\d+` or `-{month-name}` suffix
 *    is a near-certain templated copy.
 *  - Orphan — no entry url, no organiser url, no organiser name.
 *    Nothing on the page beyond the structured fields.
 *  - Duplicate sibling — ≥2 ACTIVE events share the normalised name,
 *    AND this is NOT the earliest upcoming instance. The earliest
 *    instance stays indexable so brand queries land somewhere.
 */

const MONTH_PATTERN =
  "(january|february|march|april|may|june|july|august|september|october|november|december)";

const SLUG_SUFFIX_DUPLICATE_RE = new RegExp(
  `(?:-race-\\d+|-${MONTH_PATTERN})$`,
  "i",
);

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

export type IndexabilityInput = {
  id: string;
  slug: string;
  name: string;
  sort_date: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  organiser: string | null;
};

export type SiblingEvent = {
  id: string;
  sort_date: string | null;
};

export type IndexabilityResult = {
  indexable: boolean;
  reason:
    | null
    | "past"
    | "slug-suffix-duplicate"
    | "orphan"
    | "duplicate-sibling";
};

/**
 * `siblings` should be ACTIVE events (including the current one) whose
 * normalised name equals the current event's normalised name. The
 * caller is responsible for the normalisation match — this function
 * only decides earliest-upcoming.
 *
 * `todayIso` is YYYY-MM-DD UTC. Past = strictly before today.
 */
export function computeIndexability(
  event: IndexabilityInput,
  siblings: SiblingEvent[],
  todayIso: string,
): IndexabilityResult {
  if (event.sort_date && event.sort_date < todayIso) {
    return { indexable: false, reason: "past" };
  }
  if (slugIsSuffixDuplicate(event.slug)) {
    return { indexable: false, reason: "slug-suffix-duplicate" };
  }
  const hasLink = !!(event.entry_url?.trim() || event.organiser_url?.trim());
  const hasOrganiser = !!event.organiser?.trim();
  if (!hasLink && !hasOrganiser) {
    return { indexable: false, reason: "orphan" };
  }
  // siblings includes the current event when caller queries by normalised
  // name. Require ≥2 to consider this a series.
  if (siblings.length >= 2) {
    const future = siblings
      .filter((s) => s.sort_date && s.sort_date >= todayIso)
      .sort((a, b) => (a.sort_date! < b.sort_date! ? -1 : 1));
    const earliest = future[0];
    // If no future siblings (all past) we already returned via "past"
    // above. If there are future siblings and this isn't the earliest,
    // noindex this one.
    if (earliest && earliest.id !== event.id) {
      return { indexable: false, reason: "duplicate-sibling" };
    }
  }
  return { indexable: true, reason: null };
}
