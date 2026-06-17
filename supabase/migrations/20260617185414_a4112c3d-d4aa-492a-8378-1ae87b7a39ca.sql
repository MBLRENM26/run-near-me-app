
CREATE POLICY "Service role full access" ON public.search_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.search_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
