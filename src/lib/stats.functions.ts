import { createServerFn } from "@tanstack/react-start";

export type LiveStats = {
  activeEvents: number;
  updatedAt: string;
};

/**
 * Live count of ACTIVE, non-duplicate events. Naturally ticks up as cron syncs
 * publish new events or admins flip hidden events live — the DB count IS the
 * source of truth, so no counter table to maintain.
 *
 * Runs entirely server-side and returns only an integer, so the underlying
 * `count_active_events` RPC no longer needs to be executable by anon or
 * signed-in roles.
 */
export const getLiveStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // `duplicate_of` is not readable by anon (provenance hardening revoked all
    // non-projection columns on public.events), so the count comes from a
    // security-definer function that returns only the integer.
    const { data, error } = await supabaseAdmin.rpc("count_active_events");

    if (error) {
      console.error("[getLiveStats] failed", error);
      return { activeEvents: 0, updatedAt: new Date().toISOString() };
    }

    return { activeEvents: data ?? 0, updatedAt: new Date().toISOString() };
  },
);
