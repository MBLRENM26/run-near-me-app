# EA sync cron reliability — deferred

## Decision

No code changes will be made at this time.

- The England Athletics weekly cron is failing with a 2-minute statement timeout, but the user is happy to press the manual **Run England Athletics now** button each week.
- The sync-runs table legend/tooltip clarification is also not needed right now.

## What the numbers mean (for reference)

Using the most recent manual chunk (2026-07-20 15:39 UTC):

- **Fetched 41** — events returned by the England Athletics API in that chunk.
- **Updated 32** — existing events matched by `norm_id = ea-<UUID>` and refreshed in place.
- **Skipped 9** — events discarded because they duplicate a name+date already imported from another source.
- **New 0** — no new event pages were created in that chunk.

The 41 fetched count was low because that chunk happened to be the final chunk of the EA feed (`done=true`).

## Future option

If the manual button becomes annoying, the fix is to harden `public.run_england_athletics_chunked` (smaller chunks, longer statement timeout, per-chunk retry) and add cron-status visibility to the admin UI. This remains available as a backlog item.