
CREATE OR REPLACE VIEW public.public_events
WITH (security_invoker = true)
AS
SELECT
  id, slug, name,
  date_raw, date_from, date_to, sort_date,
  is_recurring, date_is_estimated, is_upcoming,
  town, county, region, country, location_raw,
  lat, lng,
  distances, distance_tags, terrain_tags, discipline,
  entry_url, organiser_url,
  entry_fee, organiser,            -- columns retained for back-compat with callers; copy guidance still applies (never assert as fact)
  licensed, is_featured, series_key,
  status, norm_id, norm_created_at, created_at
FROM public.events
WHERE status = 'ACTIVE'
  AND duplicate_of IS NULL;

GRANT SELECT ON public.public_events TO anon, authenticated;
