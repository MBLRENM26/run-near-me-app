REVOKE EXECUTE ON FUNCTION public.consume_login_rate(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_login_rate(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_login_rate(text) FROM authenticated;