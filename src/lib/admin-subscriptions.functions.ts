import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import(
    "@/lib/admin-session.server"
  );
  return impl();
});

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

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

export const getEmailSubscriptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<SubscriptionRow[]> => {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from("email_subscriptions")
      .select(
        "id, email, event_id, kind, created_at, reminder_sent_at, events!inner(name, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      event_id: row.event_id,
      kind: row.kind,
      created_at: row.created_at,
      reminder_sent_at: row.reminder_sent_at,
      event_name: (row.events as { name: string }).name,
      event_slug: (row.events as { slug: string | null }).slug,
    }));
  },
);

export const getSubscriptionStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ total: number; byKind: Record<string, number> }> => {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from("email_subscriptions")
      .select("kind");
    if (error) throw new Error(error.message);

    const byKind: Record<string, number> = {};
    for (const row of data ?? []) {
      byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
    }

    return { total: data?.length ?? 0, byKind };
  },
);
