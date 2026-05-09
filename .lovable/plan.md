## Confirmed

Yes — the same 1000-row PostgREST cap silently truncates the main events query too. Right now the "near me" radius search only sees the first 1000 of 1900 events, so any race past that cutoff is invisible regardless of distance. Same root cause as the missing upcoming races.

## Fix

Two changes in `src/routes/index.tsx`:

1. **Add a dedicated upcoming-races query** (the originally approved fix):
   ```
   supabase.from('events')
     .select('id, name, date_raw, town, county, distance_type, entry_fee, url, is_featured')
     .eq('is_upcoming', true)
     .limit(6)
   ```
   Render the "Upcoming races" section from this query's data instead of filtering the main list. Drop `is_upcoming` from the main query select.

2. **Lift the main events query cap to 2000** by appending `.limit(2000)` to the existing select. PostgREST honours an explicit `.limit()` above the default 1000 cap, so this returns the full current dataset (~1900 rows, ~200KB) in one request.

## Why both, not just the limit bump

Even with the limit at 2000 the upcoming section would technically work, but a dedicated 6-row query is dramatically cheaper for the section's purpose and stays correct as the dataset grows. The limit bump is purely the temporary unblock for radius search.

## Out of scope (tracked for later)

- Replace the 2000-row client-side fetch with a PostGIS RPC (`nearby_events(lat, lng, radius_miles)`) before traffic scales — server-side filtering by distance is the proper fix.
- Same RPC pattern can power the region pages.
