import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash } from "crypto";

const bodySchema = z.object({
  q: z.string().trim().min(1).max(80),
  results_count: z.number().int().min(0).max(100),
});

// Daily salt — rotates per UTC day so ip_hash can be used for short-term
// rate-limit grouping but cannot be reversed across days.
function dailySalt(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}|${dailySalt()}`).digest("hex");
}

// Best-effort in-memory rate cap (per worker instance).
const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const cur = HITS.get(key);
  if (!cur || cur.resetAt < now) {
    HITS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count++;
  return cur.count > MAX_PER_WINDOW;
}

export const Route = createFileRoute("/api/public/track-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const ip_hash = hashIp(ip);

        if (ip_hash && rateLimited(ip_hash)) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ua = request.headers.get("user-agent")?.slice(0, 500) ?? null;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin
          .from("search_logs")
          .insert({
            query: parsed.data.q,
            results_count: parsed.data.results_count,
            ip_hash,
            user_agent: ua,
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("[track-search] insert error", error);
          return new Response(JSON.stringify({ error: "Log failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ search_log_id: data.id as string }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
