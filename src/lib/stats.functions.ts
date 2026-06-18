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

    const { count, error } = await supabasePublic
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .is("duplicate_of", null);

    if (error) {
      console.error("[getLiveStats] failed", error);
      return { activeEvents: 0, updatedAt: new Date().toISOString() };
    }

    return { activeEvents: count ?? 0, updatedAt: new Date().toISOString() };
  },
);
