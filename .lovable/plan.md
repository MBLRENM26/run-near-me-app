## Change

In `src/routes/running-clubs.$slug.tsx` (line 211), drop the ` · #${c.affiliation_number}` suffix so the governing body line just reads "England Athletics" (or whatever `governing_body` is).

## Out of scope

- Keep the column in the DB and in `clubs.functions.ts` SELECT — still used for internal dedup.
- No other UI, schema, or import changes.