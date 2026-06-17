## Goal

Search currently includes events whose `sort_date` is up to 14 days in the past (and ranks them alongside upcoming ones), so a query like "kent 5k" can return slots filled by races that have already happened. We want all 20 results to be upcoming/active events.

## Change

Update the `search_events_v1` Postgres function via a migration to drop the 14-day grace window — only return events where `sort_date IS NULL OR sort_date >= CURRENT_DATE`.

Specifically, change the WHERE clause from:

```sql
AND (e.sort_date IS NULL OR e.sort_date >= CURRENT_DATE - 14)
```

to:

```sql
AND (e.sort_date IS NULL OR e.sort_date >= CURRENT_DATE)
```

Signature, return columns, ranking, and the 20-result limit stay the same. The `is_past` flag in the return type becomes effectively always `false` for date-known rows, but we'll leave the column in place so `search.functions.ts` and the "Past event" badge in `src/routes/search.tsx` keep working without churn (the badge just won't render anymore).

## Why not filter in the handler

Filtering after the RPC returns would shrink the result list below 20 whenever past events were in the top-ranked set. Filtering in SQL keeps the ranker choosing from a larger pool of upcoming events, so the user reliably gets 20 relevant active results.

## Out of scope

- Date-estimated events (`date_is_estimated = true`) and events with `sort_date IS NULL` continue to appear — they're not known-past.
- No change to the homepage radius search or distance/region pages.
- No change to the search UI; the past-event badge code stays but won't trigger.
