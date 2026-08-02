REVOKE ALL ON public.events_public_v1 FROM anon;
REVOKE ALL ON public.events_public_v1 FROM authenticated;

GRANT SELECT ON public.events_public_v1 TO anon;
GRANT SELECT ON public.events_public_v1 TO authenticated;