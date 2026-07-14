## Next up: Scottish Athletics governance backfill

Small, scheduled piece of work that resolves the asymmetry the new WA/NI FAQ copy calls out — we name Scottish Athletics as a sibling governing body but currently have zero SA-tagged events, so `/scottish-athletics-permitted-races` doesn't exist yet.

### Steps

1. **Verify enum.** Check the `governance` Postgres enum already includes `scottish_athletics`. If missing, migration to add it. (Expected: already present — WA/NI were added in the same enum expansion.)
2. **Tag at source.** Update `src/lib/sync-scottish-athletics.server.ts` so every upserted row sets `governance: 'scottish_athletics'`.
3. **Backfill existing rows.** One-shot SQL:
   ```sql
   UPDATE events
   SET governance = 'scottish_athletics'
   WHERE source = 'scottishathletics' AND governance IS NULL;
   ```
   Expected: ~106 rows (matches the last SA sync count).
4. **Count check.** Confirm SA-tagged upcoming/active count clears the ~20-event threshold before shipping the landing page.
5. **Ship the landing page.** Add a `scottish_athletics` entry to `TAXONOMY_PAGES` in `src/lib/taxonomy-pages.ts` and create `src/routes/scottish-athletics-permitted-races.tsx`, mirroring the WA/NI shape. Add the slug to `src/routes/sitemap[.]xml.tsx`.
6. **Draft copy for your review before writing files** — intro + FAQs, mirroring WA/NI tone, with the "a few pounds less" phrasing. You approve before I write.

### Out of scope for this ship
- B5 discovery-gate extension (admit trusted-governance events with entry-platform-only links). Queued next.
- C audience value pages (`/for-runners`, `/for-clubs`, `/for-organisers`). Queued after B5.
- Scottish Athletics organiser-URL capture — parked, separate workstream (see `mem://backlog/scottish-athletics-organiser-urls`).

### After this ships
Recommend B5 next — small, pure discovery-gate change with an immediate before/after count on how many governance-permitted events surface on homepage/region/distance pages.
