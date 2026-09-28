import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Homelab change-feed entry point. Reports land in a private review queue
// (source_change_reports); nothing touches events until an admin accepts.
// Auth: header x-renm-signature = hex HMAC-SHA256(CHANGE_FEED_SECRET, raw body)
// and x-renm-timestamp (unix seconds, within 5 min) folded into the MAC as
// `${timestamp}.${body}` to stop replays.

const Report = z.object({
  event_id: z.string().uuid(),
  field: z.enum(["date_from", "entry_url", "entries_status", "event_status"]),
  old_value: z.string().max(2000).nullable().optional(),
  new_value: z.string().max(2000).nullable(),
  source_url: z.string().url().max(2000),
  observed_at: z.string().datetime({ offset: true }),
});
const Body = z.object({ reports: z.array(Report).min(1).max(200) });

function verify(secret: string, ts: string, body: string, sig: string): boolean {
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const Route = createFileRoute("/api/public/ingest/change-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CHANGE_FEED_SECRET;
        if (!secret) return Response.json({ error: "Not configured" }, { status: 503 });

        const ts = request.headers.get("x-renm-timestamp") ?? "";
        const sig = request.headers.get("x-renm-signature") ?? "";
        const raw = await request.text();
        if (raw.length > 512_000) return Response.json({ error: "Too large" }, { status: 413 });
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
          return Response.json({ error: "Stale or missing timestamp" }, { status: 401 });
        }
        if (!verify(secret, ts, raw, sig)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let parsed;
        try {
          parsed = Body.parse(JSON.parse(raw));
        } catch (e) {
          return Response.json(
            { error: "Invalid payload", detail: e instanceof z.ZodError ? e.issues : undefined },
            { status: 400 },
          );
        }

        const rows = parsed.reports.map((r) => ({
          ...r,
          old_value: r.old_value ?? null,
          reporter: "homelab",
          fingerprint: createHash("sha256")
            .update([r.event_id, r.field, r.new_value ?? "", r.source_url].join("|"))
            .digest("hex"),
        }));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("source_change_reports")
          .upsert(rows, { onConflict: "fingerprint", ignoreDuplicates: true })
          .select("id");
        if (error) {
          console.error("[change-report]", error.message);
          return Response.json({ error: "Store failed" }, { status: 500 });
        }
        return Response.json({ ok: true, received: rows.length, queued: data?.length ?? 0 });
      },
    },
  },
});
