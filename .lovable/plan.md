## Recommendation: wipe and re-ingest

A quick sample of the 2,558 rows shows three kinds of junk mixed in, not just events:

- **Real clubs** — "Mansfield Harriers", "Lonely Goat RC", "Hillsborough & Rivelin RC"
- **Events/races** — "Hove Prom 10k", "Bolsover 10k", "Worthington 6 2026", "Even Splits Leeds 5k Series"
- **Bare first names (people)** — "Jennifer", "Susan", "Jez", "George", "Hannah"

A name-pattern delete would catch most races but miss the people rows and risk false positives on legit clubs (e.g. anything with "Runners" / "AC" / "Tri"). A clean wipe is safer than regex surgery at this volume.

`club_claims` is currently empty (0 rows), so nothing user-generated is lost.

## Plan

1. **Migration** — `TRUNCATE public.clubs RESTART IDENTITY CASCADE;`
   - Resets the table to empty, drops any FK-linked rows (only `club_claims`, which is already empty).
2. **You re-run the ingest** with the upstream fix (`c.type === 'club'` filter applied before posting to `/api/public/import-clubs`).
3. The existing slug-collision handler we added last turn will handle any genuine duplicate slugs in the new clean batch.

## Not in scope

- No code changes on Lovable's side — the import endpoint is fine; the fix is upstream in your ingest script.
- No changes to `club_claims`, RLS, or grants.

Approve and I'll run the truncate migration so you can re-ingest into a clean table.