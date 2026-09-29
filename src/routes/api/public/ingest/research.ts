import { createFileRoute } from "@tanstack/react-router";
import { researchEnvelope } from "@/lib/source-research";
import { boundedResearchBody, validResearchSignature } from "@/lib/source-research-auth.server";

export const Route = createFileRoute("/api/public/ingest/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEARCH_FEED_SECRET;
        if (!secret) return Response.json({ error: "Not configured" }, { status: 503 });
        let raw: string;
        try {
          raw = await boundedResearchBody(request);
        } catch {
          return Response.json({ error: "Too large" }, { status: 413 });
        }
        if (
          !validResearchSignature(
            secret,
            request.headers.get("x-renm-timestamp") ?? "",
            raw,
            request.headers.get("x-renm-signature") ?? "",
          )
        ) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        let body;
        try {
          body = researchEnvelope.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "Invalid research payload" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc(
          "ingest_source_research" as never,
          { _observations: body.observations } as never,
        );
        if (error)
          return Response.json(
            { error: "Research intake refused; check source registration and observation IDs" },
            { status: 409 },
          );
        return Response.json({ ok: true, result: data });
      },
    },
  },
});
