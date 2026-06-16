P1 Structured Data sprint. Two of the four items are already live in the codebase, so this plan only covers the two that still need work.

## Already done (no work needed)

- **Item 3 — "Other races in {Town}" block.** `events.$slug.tsx` already renders this (lines 590–618) gated on `sameTown.length >= 3`, sourced from the loader's same-town query in `events.functions.ts` (ACTIVE, future, excludes current event, limit 6 in DB).
- **Item 4 — "Listed on {date}" byline.** `events.$slug.tsx` already renders `listingAdded` from `formatListingAdded(e.norm_created_at, e.created_at)`. No "last updated" claim is made.

If you want either of those tweaked (copy, placement, threshold), say so and I'll fold it in — otherwise we leave them.

## Item 1 — Enrich homepage JSON-LD

**File:** `src/routes/index.tsx` (the `scripts` array in `head()`, currently only has a minimal WebSite block).

Replace the single WebSite block with two blocks:

1. **Organization** — `name: SITE_NAME`, `url: SITE_URL`, `description` (one sentence, same tone as existing meta), `logo: ${SITE_URL}/favicon.svg` (the file we already ship; swap to a dedicated PNG later if/when we have one).
2. **WebSite** — keep current fields, add `potentialAction` SearchAction pointing at `/search?q={search_term_string}` with `query-input: "required name=search_term_string"`.

No visual change. No new assets generated.

## Item 2 — BreadcrumbList JSON-LD on region and distance pages

Two file groups still missing BreadcrumbList (RegionDistancePage and event/parkrun pages already have it):

**a. Region pages** — `src/routes/running-events.$slug.tsx`
Add a second JSON-LD script next to the existing CollectionPage block:
`Home → {Region name}` (2 items, position 1 = Home → `SITE_URL`, position 2 = region name → `${SITE_URL}/running-events/{slug}`).

**b. Distance pages** — `src/components/distance/DistancePage.tsx` (shared by `5k-races`, `10k-races`, `half-marathons`, `marathons`, `trail-running-events`, `ultra-marathons`)
Add BreadcrumbList alongside the existing CollectionPage + FAQ scripts:
`Home → {cfg.shortName} Races` (2 items, leaf URL = `${SITE_URL}${cfg.path}`).

Both use the same shape already present in `events.$slug.tsx` and `RegionDistancePage.tsx` — copy that pattern, no new helper needed.

## Out of scope

- Generating a proper square logo asset (favicon.svg is fine for now; revisit when we have brand artwork).
- Touching event-page or parkrun-page JSON-LD (already correct).
- Any UI change.
- `last_verified_at` — explicitly parked until we have a real timestamp.

## Verification

After build: view-source on `/`, `/running-events/south-east`, and `/10k-races`, confirm the new `application/ld+json` blocks parse and validate (Schema.org structure, absolute URLs). Existing blocks must remain intact.
