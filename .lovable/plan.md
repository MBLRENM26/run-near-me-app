## Goal
Populate `organiser_url` for 48 governed-but-ownerless Scottish events with the organising club's website. These currently show the "Are you the organiser?" claim CTA; after this update the event pages will link out to the organiser's own site.

## Verification
Ran the batch against the DB: all 48 slugs exist, all 48 currently have `organiser_url IS NULL` — no overwrites, pure fill-in.

## Change
One `supabase--insert` call running the 48 `UPDATE public.events SET organiser_url = ... WHERE slug = ...` statements exactly as supplied. No schema changes, no other columns touched.

## Not doing
- Not backfilling `organiser_club_id` (the deterministic matcher can pick these up on its next run now that `organiser_url` is populated — separate task if you want it forced today).
- Not touching `entry_url`, `governance`, or `organiser_type`.
- Not validating URLs live — trusting the sources you gathered.
