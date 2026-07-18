
REVOKE ALL ON TABLE public.submission_rate_hits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.submission_rate_hits TO service_role;
