## Goal

One-off manual seed of 29 pre-filtered running events from Events Up North (per your uploaded brief + CSV). No new sync, no cron, no code changes.

## Approach

Single `INSERT ... ON CONFLICT` migration (via the data-insert tool) that upserts 29 rows into `public.events`. Everything driven from the CSV — no scraping, no new endpoints.

## Field mapping per row

| Column | Source |
|---|---|
| `name` | CSV `name` |
| `slug` | `slugify(name)`; for series legs, append `-race-N-2026` or year (see slug notes) |
| `date_from`, `sort_date` | CSV `date` |
| `date_raw` | Formatted "7 July 2026" style |
| `discipline` | Road/XC for `Run`, `Trail` for `Trail run` |
| `distance_tags` | Derived from name (5K, 10K, half-marathon, 10-mile, etc.) |
| `terrain_tags` | `{road}` or `{trail}` per discipline |
| `town` | Last comma-part of `location` (fallbacks per brief for Netherhall→Maryport, Carlisle Rememb/Santa→Carlisle) |
| `location_raw` | CSV `location` verbatim |
| `county` | Cumbria / Dumfries & Galloway / Tyne and Wear per town lookup |
| `country` | England or Scotland |
| `region` | North West / North East / Scotland |
| `lat`, `lng` | Hardcoded per town (Cockermouth, Whitehaven, Carlisle, Workington, Dumfries, Dalbeattie, Maryport, Blaydon, Keswick, Wigton, Bassenthwaite, Rowlands Gill, Wrekenton, Wetherall, Eaglesfield, Grasmere) — precomputed in the migration, no runtime geocoder |
| `entry_url`, `organiser_url` | CSV `entry_url` (same value both) |
| `source` | `'eventsupnorth'` |
| `source_url` | CSV `entry_url` |
| `status` | `'ACTIVE'` |
| `is_upcoming` | `true` (all future dates) |
| `is_curated_tags` | `true` (tags are hand-derived, not scraper output) |
| `series_key` | `'am-caravans-castle-5k-2026'` for the 3 Castle legs; `'workington-5k-series-2026'` for the 2 Workington legs |
| `date_is_estimated` | `false` |

Not written: `entry_fee`, `organiser`, description (per Core rule on scraped data — the CSV doesn't carry these anyway).

## Dedupe / conflict handling

`INSERT ... ON CONFLICT (slug) DO UPDATE SET entry_url = COALESCE(events.entry_url, EXCLUDED.entry_url), organiser_url = COALESCE(events.organiser_url, EXCLUDED.organiser_url)` — so existing rows only gain the Events Up North URL if they don't already have one. Matches the brief's rule for the 3 already-in-DB events (Gelston 5, Workington Race 3, M-Sport 5K).

Series slugs use suffixed form (`am-caravans-castle-5k-race-3-2026`, `-race-4-2026`, `-race-5-2026`; `workington-5k-series-race-4-2026`) so they don't collide with existing rows or each other.

## What's explicitly NOT changing

- No changes to `ENTRY_PLATFORM_HOSTS` or `link-trust.ts` (per brief §75-79).
- No cron, no scraper, no admin endpoint.
- No excluded events imported (Northumberland Coastal Run, Wild Deer Lambton, Wild Deer Prudhoe Miners).

## Verification after insert

Run:
```sql
SELECT slug, name, sort_date, town, county, organiser_url
FROM events WHERE source = 'eventsupnorth' ORDER BY sort_date;
```
Expect 29 rows + the 4 pre-existing ones (which may or may not now show `source='eventsupnorth'` depending on their current source — we do NOT overwrite `source`, only the two URL fields).

Report back: rows inserted, rows updated (URL-only), any slug collisions, and the four already-in-DB events with their final URLs.

## Follow-up (not in scope now)

Per brief §79: revisit a proper sync endpoint only if monthly monitoring shows Events Up North adds 3+ new events per check. Parked.
