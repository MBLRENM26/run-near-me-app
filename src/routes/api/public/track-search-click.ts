import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  search_log_id: z.string().uuid(),
  clicked_slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  position: z.number().int().min(1).max(50),
});

export const Route = createFileRoute("/api/public/track-search-click")({
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

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { error } = await supabaseAdmin.from("search_clicks").insert({
          search_log_id: parsed.data.search_log_id,
          clicked_slug: parsed.data.clicked_slug,
          position: parsed.data.position,
        });

        if (error) {
          console.error("[track-search-click] insert error", error);
          return new Response(JSON.stringify({ error: "Log failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
