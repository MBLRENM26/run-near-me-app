export type LiveStats = {
  activeEvents: number;
  updatedAt: string;
};

/** Optional homepage data. Never instantiate the privileged client without its server config. */
export async function readLiveStats(): Promise<LiveStats | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Keep the existing privileged RPC; do not widen anonymous database access.
    // The lazy client's property access can throw before an RPC promise exists.
    const { data, error } = await supabaseAdmin.rpc("count_active_events");
    if (error || !Number.isSafeInteger(data) || data < 0) return null;
    return { activeEvents: data, updatedAt: new Date().toISOString() };
  } catch {
    // A missing/broken preview binding or transport must not become a server-function
    // exception for this optional badge. Privileged operations elsewhere still fail closed.
    return null;
  }
}
