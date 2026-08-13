CREATE TABLE public.mcp_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  duration_ms integer,
  client_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_tool_calls_created_at_idx ON public.mcp_tool_calls (created_at DESC);

GRANT ALL ON public.mcp_tool_calls TO service_role;
ALTER TABLE public.mcp_tool_calls ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can read or write directly.

-- Write path for the public MCP server: insert-only, no read, fixed shape.
CREATE OR REPLACE FUNCTION public.log_mcp_tool_call(
  _tool_name text,
  _ok boolean,
  _duration_ms integer,
  _client_hint text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mcp_tool_calls (tool_name, ok, duration_ms, client_hint)
  VALUES (left(coalesce(_tool_name, 'unknown'), 64),
          coalesce(_ok, true),
          least(greatest(coalesce(_duration_ms, 0), 0), 600000),
          left(_client_hint, 120));
END;
$$;

REVOKE ALL ON FUNCTION public.log_mcp_tool_call(text, boolean, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_mcp_tool_call(text, boolean, integer, text) TO anon, authenticated, service_role;