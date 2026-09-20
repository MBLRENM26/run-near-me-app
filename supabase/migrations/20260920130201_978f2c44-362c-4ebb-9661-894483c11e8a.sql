-- Restore public row visibility for the safe events projection.
-- The 19 Sep 2026 hardening dropped this policy on the incorrect assumption
-- that anon/authenticated held no column grants on public.events. They do:
-- column-level SELECT on exactly the 25 safe projection columns (provenance
-- columns source, source_url, organiser, licensed, duplicate_of are NOT
-- granted). public.events_public_v1 is security_invoker = true, so without a
-- row policy every public discovery surface returned zero rows.
CREATE POLICY "Public can read events through the safe projection"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);