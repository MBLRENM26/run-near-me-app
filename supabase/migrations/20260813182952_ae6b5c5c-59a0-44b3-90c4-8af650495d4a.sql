-- The public projection view filters on events.status, so anon/authenticated need
-- read access to that single column for the view to evaluate under security_invoker.
GRANT SELECT (status) ON public.events TO anon, authenticated;