
-- 1) Restrict events column-level SELECT for anon/authenticated to exclude source, source_url
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, name, date_raw, town, county, region, distances, entry_fee, organiser, entry_url, lat, lng, is_featured, created_at, is_upcoming, sort_date, norm_id, slug, date_from, date_to, is_recurring, country, location_raw, discipline, organiser_url, licensed, status, norm_created_at, date_is_estimated, duplicate_of, distance_tags, terrain_tags, is_curated_tags, series_key, tsv) ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;

-- 2) Explicit service_role-only policies for clarity on admin-only tables
DROP POLICY IF EXISTS "Service role full access" ON public.clubs;
CREATE POLICY "Service role full access" ON public.clubs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.club_claims;
CREATE POLICY "Service role full access" ON public.club_claims FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.sync_runs;
CREATE POLICY "Service role full access" ON public.sync_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
