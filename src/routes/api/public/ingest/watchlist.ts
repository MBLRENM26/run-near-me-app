import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Homelab watchlist: future ACTIVE events with an official page to check.
// GET, signed as HMAC(CHANGE_FEED_SECRET, `${timestamp}.watchlist`).
// Returns organiser_url / entry_url only (never events.source/source_url).

export const Route = createFileRoute("/api/public/ingest/watchlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CHANGE_FEED_SECRET;
        if (!secret) return Response.json({ error: "Not configured" }, { status: 503 });
        const ts = request.headers.get("x-renm-timestamp") ?? "";
        const sig = request.headers.get("x-renm-signature") ?? "";
        if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
          return Response.json({ error: "Stale or missing timestamp" }, { status: 401 });
        }
        const expected = createHmac("sha256", secret).update(`${ts}.watchlist`).digest();
        const given = Buffer.from(sig, "hex");
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        const out: unknown[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabaseAdmin
            .from("events")
            .select("id, slug, name, date_from, organiser_url, entry_url")
            .eq("status", "ACTIVE")
            .gte("sort_date", today)
            .order("sort_date")
            .range(from, from + 999);
          if (error) return Response.json({ error: "Read failed" }, { status: 500 });
          out.push(...(data ?? []).filter((e) => e.organiser_url || e.entry_url));
          if (!data || data.length < 1000) break;
        }
        return Response.json(
          { ok: true, count: out.length, events: out },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
