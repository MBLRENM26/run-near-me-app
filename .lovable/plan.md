## What the 1,395 dateless events actually are

Confirmed in the DB:
- **1,390** are parkruns (882 adult, 508 junior) — all already flagged `is_recurring=true`, none have `date_raw`. They don't need a `sort_date` because they're weekly.
- **5** are real one-off races with TBC dates (4 Babcock 10K Series + Salomon Skyline Scotland + Let's Do This London 10K Series). These are the only rows that belong in the date-enrichment backlog.

So you're right: the parkruns aren't missing data — they're correctly modelled as recurring. The bug is purely presentational. Right now `EventCard` just hides the date row when `date_raw` is null, so a parkrun in a search result looks dateless rather than weekly.

## Plan

### 1. Show the parkrun schedule on cards instead of a blank date row

In `src/components/events/EventCard.tsx`:
- When `isParkrunEvent(event)` and `date_raw` is null, render the schedule line in the date slot instead of hiding it:
  - "Every Saturday at 9:00am" for adult parkruns
  - "Every Sunday at 9:30am" for junior parkruns (name contains "junior")
- Keep the existing `Calendar` icon. Keep the existing "Recurring" badge.
- No change for non-parkrun events — the 5 real TBC races keep their `date_raw` ("May/June 2026" etc.) as today.

This is a small UI tweak in the card component only — no DB writes, no schema changes, no scrape change. Parkrun detail pages and the `/parkrun-events` hub already display the schedule correctly, so this just brings search results / distance pages / region pages into line.

### 2. Exclude parkruns from the date-enrichment backlog count

In the admin events index and any "needs dates" surface, exclude `lower(name) LIKE '%parkrun%'` from the dateless count. Headline number drops from 1,395 → 5, which is the honest figure for "races that genuinely need a date sourced".

### Out of scope

- No changes to the parkrun scrape or the `events` rows themselves — the data is already correct.
- No changes to the date-enrichment importer built last turn; it still works for the 5 real TBC races and any future TBC backlog.
- No change to search ranking — dateless parkruns already surface; this just stops them looking broken in the card UI.

### Files touched

- `src/components/events/EventCard.tsx` — add parkrun schedule fallback in the date row.
- `src/routes/_adminShell.admin.events.index.tsx` (or wherever the dateless count is shown) — exclude parkruns from the count.

Want me to build it?