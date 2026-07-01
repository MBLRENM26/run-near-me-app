## Hide non-UK events

### 1. Data change — mark 32 rows as `HIDDEN`

One `UPDATE` on `events` covering every ACTIVE row whose coords fall outside the GB mainland bounding box (lat 49.9–60.9, lng −8.6–1.8):

```sql
UPDATE events
SET status = 'HIDDEN'
WHERE status = 'ACTIVE'
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND (lat < 49.9 OR lat > 60.9 OR lng < -8.6 OR lng > 1.8);
```

This removes them from every discovery surface and from their own detail pages in one shot, because every public query already filters `status = 'ACTIVE'`. Includes Berlin, NYC, Stockholm, Copenhagen, Gothenburg, Medoc, Mont Blanc, Iceland, Nepal, Madagascar, Gold Coast, IceFjord, Jersey/Guernsey road races, and the 4 overseas parkruns (Gibraltar, Falklands, Guernsey, Jersey).

I'll run a pre-count `SELECT` first, then the `UPDATE`, then a verify `SELECT` in the same call.

### 2. Code change — apply UK bounds to the last unguarded query

`src/routes/index.tsx`'s "Discover events across the UK" carousel (`upcomingEvents`, ~line 172) filters `not("lat", "is", null)` but doesn't apply `UK_BOUNDS_OR_NULL`. If a future overseas event slips in with `status='ACTIVE'` and valid coords, it'd surface here. One-line fix: add `.or(UK_BOUNDS_OR_NULL)` after the `.not("lng", "is", null)` line, matching the pattern used everywhere else.

### What stays untouched

- The Melbourne, East Yorkshire event (real UK village, mis-named "Nike Melbourne Marathon" — that's a name/data-quality issue, not a location issue; leave for the second-pass review you mentioned).
- The already-`DUPLICATE` Stockholm row.
- The 204 existing `HIDDEN` rows.

### Notes for the reviewer pass

The 32 hidden rows join the existing HIDDEN pool, which you said is the first thing reviewed next round. Most have `region = 'England'` (scraper default) and gibberish "Runtalk…" `county` values — classic runtalk.co.uk aggregator artefacts — so they're easy to spot in the queue.
