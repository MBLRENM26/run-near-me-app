import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type LiveStats = {
  activeEvents: number;
  updatedAt: string;
};

/**
 * Live count of ACTIVE, non-duplicate events. Naturally ticks up as cron syncs
 * publish new events or admins flip hidden events live — the DB count IS the
 * source of truth, so no counter table to maintain.
 *
 * Uses the server publishable client (anon RLS), not the admin client, so it's
 * safe to call from public homepage SSR. The events table already exposes a
 * narrow public SELECT policy.
 */
export const getLiveStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveStats> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // `duplicate_of` is not readable by anon (provenance hardening revoked all
    // non-projection columns on public.events), so the count comes from a
    // security-definer function that returns only the integer.
    const { data, error } = await supabasePublic.rpc("count_active_events");

    if (error) {
      console.error("[getLiveStats] failed", error);
      return { activeEvents: 0, updatedAt: new Date().toISOString() };
    }

    return { activeEvents: data ?? 0, updatedAt: new Date().toISOString() };
  },
);
