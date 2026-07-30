import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import {
  loadSubscriptions,
  loadSubscriptionStats,
  type SubscriptionDeps,
  type SubscriptionsResult,
  type SubscriptionStatsResult,
} from "@/lib/admin-subscriptions.core";

export type {
  SubscriptionRow,
  SubscriptionsResult,
  SubscriptionStatsResult,
} from "@/lib/admin-subscriptions.core";

const buildDeps = createServerOnlyFn((): SubscriptionDeps => ({
  isAuthenticated: async () => {
    const { isAdminAuthenticated } = await import("@/lib/admin-session.server");
    return isAdminAuthenticated();
  },
  getClient: async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    return supabaseAdmin as unknown as { from: (table: string) => any };
  },
}));

export const getEmailSubscriptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<SubscriptionsResult> => loadSubscriptions(buildDeps()),
);

export const getSubscriptionStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<SubscriptionStatsResult> =>
    loadSubscriptionStats(buildDeps()),
);
