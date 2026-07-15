## Problem

`/running-clubs` region pills only show London (109), West Midlands (106), and Scotland (81) — a total of 296 of 1,417 active clubs. The other 1,121 are unreachable via any regional filter.

Root cause, from the DB:

- **1,063 England Athletics clubs** have `region = NULL`. Their EA "region" was imported into the `county` column instead (`South East` 232, `North West` 175, `South West` 160, `East` 139, `Yorkshire & Humberside` 137, `East Midlands` 113, `North East` 65, plus 42 with no county).
- **58 Scottish Athletics clubs** are stored as `Scotland (West) / (East) / (North)`, which don't equal the canonical `Scotland` pill.

The clubs listing (`src/lib/clubs.functions.ts` → `listClubs`) filters with `region = <REGIONS.name>`, so anything not exactly matching one of the 12 canonical names disappears from every pill.

`normaliseRegion` in `src/lib/region-normalize.ts` was meant to catch this on import, but its `COUNTY_TO_REGION` map only knows real counties (Kent, Devon, …) — it doesn't recognise EA region strings sitting in the `county` column, and it doesn't collapse the Scottish sub-region labels.

## Fix

Scope is intentionally narrow: normalise stored region values so the existing pills work. No UI changes.

### 1. Extend `src/lib/region-normalize.ts`

Add a small "already-a-region label" pass before the county lookup so EA-style values map to themselves, and Scottish sub-regions collapse to `Scotland`:

```text
South East / North West / South West / North East / East Midlands / West Midlands / London → same
East                       → East of England
Yorkshire & Humberside     → Yorkshire
Yorkshire and the Humber   → Yorkshire
Scotland (West|East|North) → Scotland
```

Applied to both `region` (early return if already canonical) and `county` (fallback).

### 2. One-off SQL backfill (migration)

Update `public.clubs` where `status = 'ACTIVE'` and `region` is `NULL` or a known non-canonical label, using the same mapping. Covers:

- EA rows: set `region` from `county` when county matches an EA-region string; fall back to lat/lng coarse mapping for the ~42 with no county.
- SA rows: rewrite `Scotland (…)` → `Scotland`.

No schema changes, no policy changes, `updated_at` bumped via existing trigger. Idempotent — re-running is safe.

### 3. Verification

After the migration:

- `SELECT region, count(*) FROM public.clubs WHERE status='ACTIVE' GROUP BY region` should show all 12 canonical regions with sensible totals and `NULL` limited to genuine unknowns (overseas / missing county+coords).
- Reload `/running-clubs` and confirm every pill returns results and the total across pills reconciles with 1,417 minus any residual `NULL`.

## Out of scope

- No changes to `RegionFilter` UI, `listClubs`, `REGIONS`, or the clubs page layout.
- No changes to how events are regionalised (already handled elsewhere).
- Sync-source data cleanup (fixing EA region-in-county at the upstream sync) is a follow-up if we want to keep future imports tidy — flagged but not required for this fix, since `normaliseRegion` will catch it on subsequent upserts.
