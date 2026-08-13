-- Harden public access to the base events table.
-- Public reads must go through public.events_public_v1 (security_invoker = true),
-- which never exposes provenance columns (source, source_url).

-- 1. Remove all write privileges from public roles (no write policies exist anyway).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.events FROM anon, authenticated;

-- 2. Remove column-level read grants that are not part of the public projection.
REVOKE SELECT (created_at, discipline, duplicate_of, is_curated_tags, is_upcoming, licensed, location_raw, norm_created_at, norm_id, organiser, series_key, status, tsv)
  ON public.events FROM anon, authenticated;

-- 3. Keep exactly the 25 projection columns readable so the view continues to work
--    under security_invoker for anon/authenticated.
GRANT SELECT (id, slug, name, date_raw, sort_date, date_from, date_to, date_is_estimated,
              is_recurring, town, county, region, country, lat, lng, distances,
              distance_tags, terrain_tags, entry_fee, entry_url, organiser_url,
              is_featured, governance, organiser_type, race_profile)
  ON public.events TO anon, authenticated;

GRANT ALL ON public.events TO service_role;