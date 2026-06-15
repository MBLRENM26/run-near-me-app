
DROP POLICY IF EXISTS "anon can insert search logs" ON public.search_logs;
DROP POLICY IF EXISTS "anon can insert search clicks" ON public.search_clicks;
REVOKE INSERT ON public.search_logs FROM anon, authenticated;
REVOKE INSERT ON public.search_clicks FROM anon, authenticated;
