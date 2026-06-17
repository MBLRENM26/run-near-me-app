## Goal

Export the events that need real dates so you can work through them and update.

## What I found

Running counts against `events` (ACTIVE, non-duplicate):

| Metric | Count |
|---|---|
| Total active events | 5,296 |
| `date_from IS NULL` | 1,395 |
| ↳ of which `source = 'parkrun'` | 1,390 |
| ↳ other (real gaps) | 5 |
| `date_is_estimated = true` | 650 |

The `date_from IS NULL` query you suggested is mostly noise — 1,390 of the 1,395 nulls are weekly parkruns, which legitimately have no fixed date. Only 5 non-parkrun events truly have no date at all.

The real "TBC" problem is **`date_is_estimated = true`** — 650 events with month-only `date_raw` like `"June 2026"`, where `sort_date` was pinned to the 1st of the month as a placeholder. These are the ones that need real published dates from the organiser.

All 650 have `source = NULL` and (in the sample I checked) `organiser_url = NULL` — they came in via an early import without source attribution, so the CSV can't link you back to where they came from. You'll have to Google each one.

## Proposed export

One CSV at `/mnt/documents/tbc-events.csv` with the 650 estimated-date events, plus a small second CSV for the 5 true-null non-parkruns:

**`tbc-events-estimated.csv`** (650 rows)
Columns: `id, name, slug, town, county, country, date_raw, sort_date, distances, entry_url, organiser_url`

Ordered by `sort_date, name` so you can work month-by-month and prioritise events that are nearly upon us.

**`tbc-events-null-date.csv`** (5 rows)
Same columns, the genuine no-date stragglers.

I'd also add a `public_url` column (`https://runningeventsnearme.com/events/{slug}`) so you can click straight to the live page while you research.

## Recommendation for the workflow itself

Since none of these have a source URL, a CSV is the right tool — but consider:

1. **Triage by `sort_date`** — fix anything in the next ~3 months first; June 2026+ can wait.
2. **Bulk-suspend the long tail?** Anything with `sort_date > CURRENT_DATE + 12 months` and no organiser URL is low-value SEO clutter. Worth a separate conversation about whether to set `status='HIDDEN'` until a real date is known.
3. **Stop accepting estimated dates on future imports** — the scraper change to reject month-only dates is a separate small ticket worth queuing.

Happy to also build a small admin screen for working through these in-app (search + edit date + save) instead of CSV-out-then-SQL-back, if that's preferable — let me know.

## Out of scope

- Any actual date corrections (manual research task).
- Changing parkrun handling — null `date_from` is correct for them.
- Admin UI for TBC fixing (mentioned as an option above, not in this plan).
