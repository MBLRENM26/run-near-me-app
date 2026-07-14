import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Safety-net cron: catch any submission that never got an admin email.
// Looks 30 days back, for any submissions row that does NOT have a
// corresponding email_send_log row with status 'sent' or 'pending' under
// the deterministic message_id `admin-new-submission-<id>`.

function isAuthorized(request: Request): boolean {
  const adminSecret = process.env.IMPORT_SECRET;
  if (!adminSecret) return false;
  const provided = request.headers.get("x-admin-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(adminSecret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute(
  "/api/public/hooks/notify-missed-submissions",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.IMPORT_SECRET) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendNewSubmissionNotification, adminNotifyMessageId } =
          await import("@/lib/notify.server");

        const cutoff = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data: candidates, error } = await supabaseAdmin
          .from("submissions")
          .select("id, email, kind, claim_slug, submitted_at")
          .gte("submitted_at", cutoff)
          .order("submitted_at", { ascending: false });
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const rows = candidates ?? [];
        if (rows.length === 0) {
          return Response.json({ ok: true, checked: 0, resent: 0, failed: 0 });
        }

        // One indexed lookup of already-notified message_ids.
        const messageIds = rows.map((r) => adminNotifyMessageId(r.id));
        const { data: logs } = await supabaseAdmin
          .from("email_send_log")
          .select("message_id, status")
          .in("message_id", messageIds);

        const notified = new Set<string>();
        for (const l of logs ?? []) {
          if (l.status === "sent" || l.status === "pending") {
            notified.add(l.message_id as string);
          }
        }

        let resent = 0;
        let failed = 0;
        const results: Array<{ id: string; status: string }> = [];
        for (const row of rows) {
          const mid = adminNotifyMessageId(row.id);
          if (notified.has(mid)) continue;
          const res = await sendNewSubmissionNotification({
            id: row.id,
            email: row.email,
            kind: row.kind as "listing" | "claim",
            claim_slug: row.claim_slug,
            submitted_at: row.submitted_at,
          });
          results.push({ id: row.id, status: res.status });
          if (res.ok) resent++;
          else failed++;
        }

        return Response.json({
          ok: true,
          checked: rows.length,
          resent,
          failed,
          results,
        });
      },
    },
  },
});
