## Seed `events` table with 1,900 UK running events

Import all 1,900 rows from `UK_Running_Events_2026_-_Full_Seed_-_All_Events.csv` into the existing `public.events` table.

### Column mapping (CSV → DB)
The CSV header already matches the target column names 1:1:

`region, name, date_raw, town, county, distance_type, entry_fee, organiser, url, latitude, longitude`

`is_featured` will be set to `false` for every row. `id` and `created_at` use their defaults.

### Approach
1. Read `/tmp/events.csv` and generate a single SQL script with batched multi-row `INSERT INTO public.events (...) VALUES (...), (...), ...;` statements (batches of ~500 rows to keep statements manageable).
2. Escape single quotes in text fields; convert empty `latitude`/`longitude` cells to `NULL` (a few rows may lack coords); all other empty text cells inserted as empty strings or `NULL` where the column is nullable — empties will become `NULL` for consistency.
3. Execute via the Supabase data tool (per project rules, data inserts use the insert tool, not the schema migration tool — even though you said "migration", the right mechanism here is the insert tool so the schema isn't touched).
4. Verify row count after insert (`SELECT count(*) FROM events;` should return 1900, assuming the table is empty beforehand).

### Notes / things to confirm
- **Duplicates**: if the table already has seed data from earlier development, this import will add on top. Recommend truncating first — shall I include a `DELETE FROM public.events;` at the start of the import?
- **Featured flag**: all rows imported with `is_featured = false`, as requested. You can flip specific rows to featured later.
- **Region values**: CSV uses values like `Yorkshire`, `Northern Ireland`, etc. These must match the region slugs/labels in `src/lib/regions.ts` for the `/running-events/[region]` pages to populate. Worth a quick cross-check after import.