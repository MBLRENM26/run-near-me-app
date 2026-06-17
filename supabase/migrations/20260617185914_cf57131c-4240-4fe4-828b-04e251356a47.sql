
CREATE POLICY "Service role full access" ON public.submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
