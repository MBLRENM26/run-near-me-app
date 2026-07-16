## Goal
Export all events (319 rows) whose `entry_url`, `organiser_url`, or `source_url` contains `eventrac.co.uk` to a downloadable CSV.

## Columns
- name
- sort_date (canonical date)
- date_raw
- slug + public URL (`https://runningeventsnearme.com/events/{slug}`)
- town, county, region
- organiser_url
- entry_url
- source_url (for provenance — admin-only field, safe here as it's an export not a public page)
- status
- governance, organiser_type

## Approach
1. Run a single SQL select against `public.events` filtered by `ILIKE '%eventrac.co.uk%'` across the three URL columns, ordered by `sort_date`.
2. Write result to `/mnt/documents/eventrac-events.csv` via psql `COPY ... TO STDOUT WITH CSV HEADER`.
3. Emit a `<presentation-artifact>` tag so you can download it directly.

No code or DB changes. Read-only export.
