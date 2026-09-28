import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireChangeFeedAcceptance } from "@/lib/change-feed-release";

const requireAdmin = createServerOnlyFn(async () => {
  const { isAdminAuthenticated } = await import("@/lib/admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
});

export type ChangeReportRow = {
  id: string;
  event_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  source_url: string;
  observed_at: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  event: { name: string; slug: string | null; date_from: string | null; entry_url: string | null } | null;
};

const STATUSES = ["pending", "accepted", "rejected", "unknown"] as const;

export const listChangeReports = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ status: z.enum(STATUSES) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error, count } = await supabaseAdmin
      .from("source_change_reports")
      .select(
        "id, event_id, field, old_value, new_value, source_url, observed_at, status, admin_note, created_at, event:events(name, slug, date_from, entry_url)",
        { count: "exact" },
      )
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as unknown as ChangeReportRow[], total: count ?? 0 };
  });

// Only date_from and entry_url are ever written to events. entries_status and
// event_status (cancelled/postponed) are recorded as an audited edit note only:
// lifecycle transitions stay a separate, manual decision per the contract.
export const reviewChangeReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["accepted", "rejected", "unknown"]),
        note: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    requireChangeFeedAcceptance(data.decision);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin
      .from("source_change_reports")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !r) throw new Error("Report not found");
    if (r.status !== "pending") return { ok: true, alreadyReviewed: true };

    if (data.decision === "accepted") {
      const patch: Record<string, string | null> = {};
      if (r.field === "date_from") {
        if (!r.new_value || !/^\d{4}-\d{2}-\d{2}$/.test(r.new_value)) {
          throw new Error("New date must be YYYY-MM-DD");
        }
        patch.date_from = r.new_value;
        patch.sort_date = r.new_value;
      } else if (r.field === "entry_url") {
        patch.entry_url = r.new_value;
      }
      if (Object.keys(patch).length) {
        const { error: upErr } = await supabaseAdmin
          .from("events")
          .update(patch as never)
          .eq("id", r.event_id);
        if (upErr) throw new Error(upErr.message);
      }
      await supabaseAdmin.from("event_edits").insert({
        event_id: r.event_id,
        changes: {
          source: "change-feed",
          report_id: r.id,
          field: r.field,
          old: r.old_value,
          new: r.new_value,
          evidence_url: r.source_url,
          observed_at: r.observed_at,
          applied: Object.keys(patch),
        },
        note: data.note ?? null,
      });
    }

    const { error: stErr } = await supabaseAdmin
      .from("source_change_reports")
      .update({ status: data.decision, admin_note: data.note ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (stErr) throw new Error(stErr.message);
    return { ok: true };
  });
