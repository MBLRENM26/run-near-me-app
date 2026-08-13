-- The homepage live counter needs an exact count of ACTIVE, non-duplicate events.
-- `duplicate_of` is an internal column and is deliberately NOT readable by anon
-- after the provenance-hardening migration, so expose the count (a single
-- integer) through a security-definer function instead of re-widening SELECT.
CREATE OR REPLACE FUNCTION public.count_active_events()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.events
  WHERE status = 'ACTIVE'
    AND duplicate_of IS NULL;
$$;

REVOKE ALL ON FUNCTION public.count_active_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_active_events() TO anon, authenticated, service_role;