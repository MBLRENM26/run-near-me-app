import { createClient } from "@supabase/supabase-js";

/**
 * Minimal usage instrumentation for the public MCP server.
 *
 * We have no other telemetry for /mcp (calls hit the Worker, not the DB), so
 * without this we can't tell whether the server is used at all — which is the
 * evidence needed to decide between keeping it public and gating it behind OAuth.
 *
 * Deliberately narrow: tool name, success flag, duration, and a coarse client
 * hint (User-Agent, truncated). No arguments, no results, no IPs, no PII.
 * Writes go through the insert-only `public.log_mcp_tool_call` RPC with the
 * publishable key — never a service-role client.
 */

function coarseClientHint(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 120);
}

async function record(
  toolName: string,
  ok: boolean,
  durationMs: number,
  clientHint: string | null,
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.rpc("log_mcp_tool_call", {
      _tool_name: toolName,
      _ok: ok,
      _duration_ms: Math.round(durationMs),
      _client_hint: clientHint,
    });
  } catch {
    // Instrumentation must never fail a tool call.
  }
}

/**
 * Wrap an MCP tool handler so every invocation is logged. Any logging failure
 * is swallowed; the tool's own result is returned unchanged.
 */
export function withUsageLogging(
  toolName: string,
  handler: (input: any, ctx?: any) => any,
): any {
  return async (input: any, ctx?: any) => {
    const started = Date.now();
    let ok = true;
    try {
      const result = await handler(input, ctx);
      ok = !(result && typeof result === "object" && result.isError === true);
      return result;
    } catch (err) {
      ok = false;
      throw err;
    } finally {
      const hint = coarseClientHint(
        typeof ctx?.getRequest === "function"
          ? ctx.getRequest()?.headers?.get?.("user-agent")
          : undefined,
      );
      await record(toolName, ok, Date.now() - started, hint);
    }
  };
}
