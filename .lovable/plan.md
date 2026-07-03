## Goal

Lift the two Phase-1 blocks that the audit showed are barely rendering: "Same weekend nearby" (2/20 pages) and "Organised by" / "Other races by organiser" (0/20 pages). Both are data problems, not UI bugs.

## Part 1 — Widen "Same weekend nearby": county → region fallback

**Change:** `src/lib/events.functions.ts` — the block that builds `sameWeekendNearby`.

Current behaviour: strict county filter, ±2 days, cap 6, only rendered when >= 3 results.

New behaviour:
1. Query county first (unchanged).
2. If county returns < 3, run a second query scoped to `region` instead, excluding the current event and any slugs already in the county result.
3. Merge: county results first, then region fill, cap 6.
4. Tag each row with `scope: 'county' | 'region'` so the UI can label region-fills as "Nearby in {region}" vs county rows as "Same weekend in {county}".
5. Keep the `hasOrganiserOwnedLink` filter and the ±2 day window unchanged.
6. Keep the `>= 3` render threshold — that's a UI-quality bar, not a data bar.

**UI:** `src/routes/events.$slug.tsx` — split the block into two sub-lists when both scopes are present, or a single list with a subtle "in {region}" suffix on region-scoped rows. Heading stays "Same weekend nearby".

**Skips:** events with no county AND no region (TRA, parkrun without location) still can't render — that's fine, they're a small slice.

## Part 2 — Capture the organiser from the England Athletics feed

**Change:** `src/lib/sync-england-athletics.server.ts`.

The audit found `events.organiser` is NULL on 19/20 top pages because the EA sync never sets it. The EA API almost certainly carries a hosting club per event; we need to confirm which field and persist it.

Steps:
1. Inspect one live EA payload (fetch page 1 during implementation, log one event object) to identify the organiser field. Candidates seen in similar feeds: `organiser`, `host_club`, `club`, `organisation`, `promoter`, or a nested object with `name`.
2. Extend the `EaEvent` type with the discovered field(s).
3. Map it into the `organiser` column on the upsert row. Trim, title-case only if fully upper-case (same helper pattern as `titleCaseTown`).
4. If the EA payload exposes a club identifier or website, capture it into `organiser_url` when we don't already have a website_url. Otherwise leave organiser_url as today.
5. Re-run the EA sync (chunked via the existing `run_england_athletics_chunked` function) after deploy to backfill the ~4,900 EA rows.

**If the field genuinely isn't in the JSON** (possible — the EA finder API is minimal): stop, report back, and we'll look at either (a) scraping the individual event detail page during sync, or (b) a fuzzy-match backfill from the free-text `name` against `clubs.name`. Don't ship a scrape without checking in.

## Part 3 — Verification

- Re-run the audit script against the same 20-slug sample after both changes land + EA re-sync completes.
- Expected: "Same weekend nearby" render rate rises from 10% (2/20) toward 60-80%; "Organised by" render rate rises from 0% toward whatever share of EA events actually carry a club (unknown until step 2.1).
- Append updated numbers to `docs/audits/top-event-pages-2026-07-03.md` under a "Post-fix" section.

## Out of scope

- Fuzzy club matching (`Jarrow & Hebburn AC` vs `and`) — only worth doing if step 2.1 succeeds and matches are still missing.
- Dropping the >= 3 threshold on nearby.
- Any surfacing of the Phase 2 classification columns.
- `/for-runners`, `/for-clubs`, `/for-organisers` pages.

## Technical notes

- Region fallback query reuses `DISCOVERY_EVENT_COLUMNS` + `UK_BOUNDS_OR_NULL`; no schema changes.
- Region query must exclude the current event id and any slugs already returned by the county query to avoid dupes.
- Order: county rows by `sort_date ASC`, then region fill by `sort_date ASC`.
- EA sync change is idempotent (upsert on `norm_id`), so a full re-run is safe and will populate organiser on existing rows without touching slugs.
- No migrations. No new grants.
