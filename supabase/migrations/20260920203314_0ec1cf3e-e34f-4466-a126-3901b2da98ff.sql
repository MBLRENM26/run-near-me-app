-- Public reads of race records now go only through the sanctioned safe view.
-- events_public_v1 already carries an explicit column allow-list (no source /
-- source_url) and filters to status = 'ACTIVE'. Making it a non-invoker view
-- means visitors never need any privilege on the base events table.
ALTER VIEW public.events_public_v1 SET (security_invoker = false, security_barrier = true);

-- Public RPCs that read events must therefore run as their owner. Both return
-- explicit safe column lists and filter to ACTIVE (and future-dated) rows.
ALTER FUNCTION public.events_within_radius(double precision, double precision, double precision, integer) SECURITY DEFINER;
ALTER FUNCTION public.search_events_v1(text, integer) SECURITY DEFINER;

-- Remove all direct public access to the base table.
DROP POLICY IF EXISTS "Public can read events through the safe projection" ON public.events;
REVOKE SELECT ON public.events FROM anon;
REVOKE SELECT ON public.events FROM authenticated;

GRANT SELECT ON public.events_public_v1 TO anon, authenticated;