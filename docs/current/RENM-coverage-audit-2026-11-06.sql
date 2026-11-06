-- Private, read-only baseline; fixed UTC date for reproducible selection.
-- Stored candidates are not a discovery count or verified UK occurrences.
WITH candidates AS (
  SELECT id, name, slug, sort_date, date_from, date_to,
         town, county, region, country, lat, lng,
         organiser_url, entry_url, date_is_estimated, is_recurring
  FROM public.events
  WHERE status = 'ACTIVE' AND duplicate_of IS NULL
    AND sort_date >= DATE '2026-11-06'
)
SELECT *, CASE
  WHEN lat IS NULL AND lng IS NULL THEN 'missing_pair'
  WHEN lat IS NULL OR lng IS NULL THEN 'partial_pair'
  WHEN lat = 0 AND lng = 0 THEN 'zero_pair'
  WHEN abs(lat - 52.8381640101579) < 0.00001
   AND abs(lng + 2.32748084361657) < 0.00001 THEN 'known_fallback'
  WHEN NOT (lat BETWEEN 49.9 AND 60.9 AND lng BETWEEN -8.6 AND 1.8)
    THEN 'outside_discovery_envelope'
END AS issue
FROM candidates
WHERE lat IS NULL OR lng IS NULL
   OR (lat = 0 AND lng = 0)
   OR (abs(lat - 52.8381640101579) < 0.00001
       AND abs(lng + 2.32748084361657) < 0.00001)
   OR NOT (lat BETWEEN 49.9 AND 60.9 AND lng BETWEEN -8.6 AND 1.8)
ORDER BY name, slug;

-- All states/dates: do not hide stale or duplicate Kent leads.
SELECT id, name, slug, status, duplicate_of, sort_date, date_from,
       date_to, town, county, region, country, lat, lng,
       organiser_url, entry_url, is_recurring, date_is_estimated
FROM public.events
WHERE lower(btrim(coalesce(county, ''))) IN
      ('kent', 'medway', 'kent & medway', 'kent and medway')
ORDER BY sort_date NULLS LAST, name, slug;

-- Candidate duplicate clusters; NEVER automatically merge from these keys.
SELECT lower(name) AS name_key, sort_date, lower(coalesce(town, '')) AS town_key,
       array_agg(slug ORDER BY slug) AS slugs, count(*) AS rows
FROM public.events
WHERE status = 'ACTIVE' AND duplicate_of IS NULL
  AND sort_date >= DATE '2026-11-06'
GROUP BY lower(name), sort_date, lower(coalesce(town, ''))
HAVING count(*) > 1
ORDER BY rows DESC, name_key;

-- Missing occurrence dates versus legitimate undated recurring listings.
SELECT is_recurring, count(*) AS rows
FROM public.events
WHERE status = 'ACTIVE' AND duplicate_of IS NULL AND sort_date IS NULL
GROUP BY is_recurring;

-- End-date overlap does not prove a single multi-day occurrence:
-- series represented by date ranges require identity reconciliation.
SELECT name, slug, sort_date, date_to, town, county
FROM public.events
WHERE status = 'ACTIVE' AND duplicate_of IS NULL
  AND sort_date < DATE '2026-11-06' AND date_to >= DATE '2026-11-06';

-- Read schedule metadata only: command strings may contain secrets.
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
SELECT source, started_at, finished_at, status, fetched, written,
       new_events, updated_existing, skipped_no_date, failed_pages,
       error_message, review_integrity
FROM public.sync_runs
WHERE started_at >= DATE '2026-10-07'
ORDER BY started_at DESC;