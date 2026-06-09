# De-duplicate event listings

## What's wrong
The nearby results (and region/distance pages) show the same race twice because the database holds duplicate rows from different scrape runs:

1. **Exact duplicates** — same name + town + date ingested twice with different slugs (338 groups, mostly England Athletics re-ingests, some runabc).
2. **Estimated vs confirmed pairs** — an older scrape with a month-only guessed date ("September 2026 — date TBC") alongside a newer row with the real confirmed date (630 groups). Dartford Bridge 10K, Spitfire Scramble and Petts Wood 10k are all this type.
3. **Race series** (same name, genuinely different dates — e.g. "Tavy 5" ×24) are NOT duplicates and will not be touched.

## Approach

### 1. Mark duplicates, never delete
- Add a `duplicate_of` column (points at the surviving row) and a `DUPLICATE` status value. Nothing is deleted — fully reversible.
- **Survivor ranking** within each duplicate group (same name + town, and either identical date or estimated-vs-confirmed in the same year):
  1. Confirmed date beats estimated date
  2. Event-specific entry link beats generic/none (generic runabc regional URLs count as none)
  3. Newer scrape beats older
- **Field merge**: if the survivor is missing a value the loser has (entry URL, organiser URL, region, county, date_raw), copy it across — so the Dartford Bridge survivor keeps the real 13 September date AND the proper eventrac entry link.

### 2. Redirect retired pages (protects your Google indexing)
- Duplicate slugs may already be crawled. The event page will issue a **permanent redirect** from a duplicate's URL to the survivor's URL, so any indexed dupe page passes its value to the kept page instead of 404ing.
- Sitemap/listing queries already filter to `status = 'ACTIVE'`, so dupes vanish from all lists, counts and "More races in {region}" blocks automatically — the live About-paragraph counts become more accurate too.

### 3. Run the dedupe
- One SQL migration: add column/status, then a single pass that ranks each group, marks losers as `DUPLICATE` with `duplicate_of`, and merges missing fields into survivors.
- Verification queries before/after: total active events, group counts (expect ~970 rows retired of ~6,700), spot-checks on Dartford Bridge, Petts Wood, Spitfire Scramble, and a series like Tavy 5 (must remain untouched).

## Technical details
- Migration: `ALTER TABLE events ADD COLUMN duplicate_of uuid REFERENCES events(id)`; dedupe pass uses `row_number()` over groups keyed on `(lower(name), lower(coalesce(town,'')))` joined two ways: exact `sort_date` match, and estimated↔confirmed within same year.
- `src/lib/events.functions.ts` — `getEventPageData`: when the slug resolves to a `DUPLICATE` row, return the survivor's slug; route loader throws `redirect({ to: '/events/$slug', params, statusCode: 301 })`.
- `src/routes/events.$slug.tsx` — handle the redirect signal in the loader.
- No UI changes otherwise; all listing queries already filter to ACTIVE.

## Out of scope
- Preventing future duplicate ingests (a uniqueness check in the scraper pipeline) — recommended follow-up when the fee-data rebuild happens.
