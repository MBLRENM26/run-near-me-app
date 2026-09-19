-- Security remediation: remove permissive all-column public read policy on events.
-- Anonymous/authenticated roles already hold no column grants on public.events;
-- public reads go through the restricted projection instead. This drops the
-- residual USING (true) policy so provenance columns can never be exposed.
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

-- SECURITY DEFINER functions must not be callable from the exposed API roles.
-- Both are now invoked server-side only (service role).
REVOKE ALL ON FUNCTION public.count_active_events() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_active_events() TO service_role;

REVOKE ALL ON FUNCTION public.log_mcp_tool_call(text, boolean, integer, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_mcp_tool_call(text, boolean, integer, text) TO service_role;