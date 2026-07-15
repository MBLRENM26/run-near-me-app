## Goal
Give you a CSV of the ~42 ACTIVE clubs with `region IS NULL` so you can manually assign regions, plus note the Wales / Northern Ireland gap.

## Steps
1. Run a `psql` COPY against `public.clubs` for `status = 'ACTIVE' AND region IS NULL`, exporting these columns:
   - `id, slug, name, governing_body, affiliation_number, town, county, postcode, lat, lng, website_url`
2. Write to `/mnt/documents/clubs-null-region.csv` and surface it via `<presentation-artifact>` so you can download.
3. Also run a quick count of ACTIVE clubs by `governing_body` where `region IS NULL`, and a count for Wales / Northern Ireland totals, and report the numbers in chat so you know what's missing before dispatching a research agent.

## Not doing
- No schema or data changes. Once you've assigned regions in the CSV, send it back and I'll apply the updates via a migration (or inline `UPDATE`s).
- No changes to `region-normalize.ts` — 42 rows aren't worth another mapping rule.

## Wales / NI
Neither has any clubs in the DB yet (Welsh Athletics + Athletics NI syncs haven't been built). Happy to scope those sync tasks separately — a research agent gathering the source club lists (JustGo/other) would be useful input.
