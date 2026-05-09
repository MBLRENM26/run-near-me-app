## Add sort_date column and order events chronologically

### Migration

Add nullable `sort_date date` column to `events`, then populate via a single UPDATE using a CASE expression with regex matching. Order matters — most specific patterns first.

Parsing rules (applied in order):

1. **Date range starting with day** (e.g. `9-10 May 2026`, `30 Oct-01 Nov 2026`, `10-11 October 2026`) — extract leading day + first month/year encountered, parse via `to_date`.
2. **Single day** `D Month YYYY` (e.g. `9 May 2026`) — `to_date(date_raw, 'FMDD Mon YYYY')` (Postgres `Mon`/`Month` accept both abbreviated and full month names with `FM`).
3. **Month only** `Month YYYY` (e.g. `May 2026`, `October 2026`) — `to_date('1 ' || date_raw, 'FMDD Mon YYYY')`, giving the 1st of that month.
4. **Anything else** (`TBC 2026`, `Late June / Early July 2026`, `May/June 2026`, `May–Dec 2026`) — leave NULL.

Implementation sketch:

```sql
ALTER TABLE public.events ADD COLUMN sort_date date;

UPDATE public.events
SET sort_date = CASE
  -- Range: leading day, then "<day>[-<day>] [<Mon>-]?<Mon> <YYYY>"
  -- Capture leading day and the LAST month + year in the string
  WHEN date_raw ~ '^\d{1,2}[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$'
    THEN to_date(
      regexp_replace(date_raw, '^(\d{1,2})[-–]\d{1,2}\s+([A-Za-z]+)\s+(\d{4})$', '\1 \2 \3'),
      'FMDD Mon YYYY')
  -- Cross-month range e.g. "30 Oct-01 Nov 2026"
  WHEN date_raw ~ '^\d{1,2}\s+[A-Za-z]+[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$'
    THEN to_date(
      regexp_replace(date_raw, '^(\d{1,2}\s+[A-Za-z]+)[-–].*\s+(\d{4})$', '\1 \2'),
      'FMDD Mon YYYY')
  -- Single day "D Month YYYY"
  WHEN date_raw ~ '^\d{1,2}\s+[A-Za-z]+\s+\d{4}$'
    THEN to_date(date_raw, 'FMDD Mon YYYY')
  -- Month only "Month YYYY"
  WHEN date_raw ~ '^[A-Za-z]+\s+\d{4}$'
    THEN to_date('1 ' || date_raw, 'FMDD Mon YYYY')
  ELSE NULL
END;

CREATE INDEX events_sort_date_idx ON public.events (sort_date);
```

`to_date` will accept both `Jul` and `July` with the `Mon` token in modern Postgres; if any rows fail to parse they'll surface as errors during the migration and we'll wrap problem cases in a safe `BEGIN/EXCEPTION` per-row via a one-shot DO block. Plan to use a DO block iterating rows so a single bad value can't fail the whole migration.

### Frontend query updates

All three Supabase queries get `.order('sort_date', { ascending: true, nullsFirst: false })`:

- `src/routes/index.tsx` — main `['events']` query (near-me list).
- `src/routes/index.tsx` — `['events','upcoming']` query: drop any random ordering, add the sort_date order. Keep `.eq('is_upcoming', true).limit(6)`. This now returns the 6 soonest upcoming events.
- `src/routes/running-events.$slug.tsx` — region query.

### Out of scope

- No schema changes beyond `sort_date` + index.
- No changes to `is_upcoming` logic.
- PostGIS work still deferred.
