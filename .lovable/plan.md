## Goal
Backfill `region` on 42 Fordy Runs Running Club franchise locations so they appear on the correct regional running-clubs pages.

## Verification
- All 42 ids exist and all currently have `region IS NULL` — no overwrites.
- All 12 target region values are canonical (`South East`, `West Midlands`, `East of England`, `South West`, `Yorkshire`, `North West`, `London`, `North East`, `East Midlands`, `Wales`) — match `REGIONS` in `src/lib/regions.ts`.
- Wrexham → Wales is the first Welsh club in the DB, so `/running-clubs?region=wales` will start rendering after this.

## Change
One `supabase--insert` call running the 42 `UPDATE public.clubs SET region = ... WHERE id = ...` statements exactly as supplied.

## Not doing
- Not updating `county`, `town`, or any other column.
- Not merging/deduping the franchise chain — each location stays its own row.
