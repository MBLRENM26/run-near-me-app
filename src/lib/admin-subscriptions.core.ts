export interface SubscriptionRow {
  id: string;
  email: string;
  event_id: string;
  event_name: string;
  event_slug: string | null;
  kind: string;
  created_at: string;
  reminder_sent_at: string | null;
}

export type SubscriptionsResult =
  | { status: "unauthenticated" }
  | { status: "ok"; rows: SubscriptionRow[] };

export type SubscriptionStatsResult =
  | { status: "unauthenticated" }
  | { status: "ok"; total: number; byKind: Record<string, number> };

export interface SubscriptionDeps {
  isAuthenticated: () => Promise<boolean>;
  /** Only called after authentication succeeds. */
  getClient: () => Promise<{
    from: (table: string) => any;
  }>;
}

export const UNAUTHENTICATED = { status: "unauthenticated" } as const;

export async function loadSubscriptions(
  deps: SubscriptionDeps,
): Promise<SubscriptionsResult> {
  if (!(await deps.isAuthenticated())) return { status: "unauthenticated" };

  const client = await deps.getClient();
  const { data, error } = await client
    .from("email_subscriptions")
    .select(
      "id, email, event_id, kind, created_at, reminder_sent_at, events!inner(name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    email: row.email as string,
    event_id: row.event_id as string,
    kind: row.kind as string,
    created_at: row.created_at as string,
    reminder_sent_at: (row.reminder_sent_at as string | null) ?? null,
    event_name: (row.events as { name: string }).name,
    event_slug: (row.events as { slug: string | null }).slug,
  }));

  return { status: "ok", rows };
}

export async function loadSubscriptionStats(
  deps: SubscriptionDeps,
): Promise<SubscriptionStatsResult> {
  if (!(await deps.isAuthenticated())) return { status: "unauthenticated" };

  const client = await deps.getClient();
  const { data, error } = await client
    .from("email_subscriptions")
    .select("kind");
  if (error) throw new Error(error.message);

  const byKind: Record<string, number> = {};
  for (const row of (data ?? []) as { kind: string }[]) {
    byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
  }

  return { status: "ok", total: data?.length ?? 0, byKind };
}

/** Presentation state derived from both requests. Unauthenticated can never be zero-rows. */
export type SubscriptionsViewState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string }
  | {
      kind: "data";
      rows: SubscriptionRow[];
      total: number;
      byKind: Record<string, number>;
    };

export function deriveViewState(input: {
  isLoading: boolean;
  error?: unknown;
  subs?: SubscriptionsResult;
  stats?: SubscriptionStatsResult;
}): SubscriptionsViewState {
  if (input.error) {
    return {
      kind: "error",
      message:
        input.error instanceof Error ? input.error.message : "Failed to load",
    };
  }
  if (
    input.subs?.status === "unauthenticated" ||
    input.stats?.status === "unauthenticated"
  ) {
    return { kind: "unauthenticated" };
  }
  if (input.isLoading || !input.subs) return { kind: "loading" };
  return {
    kind: "data",
    rows: input.subs.rows,
    total: input.stats?.status === "ok" ? input.stats.total : input.subs.rows.length,
    byKind: input.stats?.status === "ok" ? input.stats.byKind : {},
  };
}
