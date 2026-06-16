REVOKE ALL ON public.search_logs FROM anon, authenticated;
REVOKE ALL ON public.search_clicks FROM anon, authenticated;
GRANT ALL ON public.search_logs TO service_role;
GRANT ALL ON public.search_clicks TO service_role;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.submissions FROM anon;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.submissions FROM authenticated;
GRANT INSERT ON public.submissions TO anon;
GRANT ALL ON public.submissions TO service_role;