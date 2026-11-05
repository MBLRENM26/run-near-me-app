import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { researchIntakeEnvelope } from "@/lib/source-research";
import { boundedResearchBody, validResearchSignature } from "@/lib/source-research-auth.server";

export const Route = createFileRoute("/api/public/ingest/research")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.RESEARCH_FEED_SECRET;
        const headers = { "Cache-Control": "no-store" };
        if (!secret) return Response.json({ error: "Not configured" }, { status: 503, headers });
        const url = new URL(request.url);
        const version = url.searchParams.get("version");
        const selection = url.searchParams.get("sources");
        let ids: string[] | null = null;
        if (version !== null || selection !== null) {
          ids = (selection ?? "").split(",");
          if (
            version !== "2" ||
            ids.length > 30 ||
            ids.some(
              (id) =>
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
                  id,
                ),
            ) ||
            new Set(ids).size !== ids.length ||
            [...ids].sort().join(",") !== selection
          ) {
            return Response.json({ error: "Invalid source selection" }, { status: 400, headers });
          }
        }
        // Bind the exact requested source set to the HMAC. Old signatures cannot
        // request v2 controls and no caller can expand the signed allowlist.
        const purpose = ids ? `sources.v2.${ids.join(",")}` : "sources";
        if (
          !validResearchSignature(
            secret,
            request.headers.get("x-renm-timestamp") ?? "",
            purpose,
            request.headers.get("x-renm-signature") ?? "",
          )
        ) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as SupabaseClient;
        const { data, error } = await db.rpc("research_monitor_controls", { _source_ids: ids });
        if (
          error ||
          !data ||
          !Array.isArray(data.sources) ||
          (ids &&
            (data.sources.length !== ids.length ||
              data.sources.some((row: { id: string }) => !ids.includes(row.id)) ||
              new Set(data.sources.map((row: { id: string }) => row.id)).size !== ids.length)) ||
          (!ids && data.sources.length > 1000)
        ) {
          return Response.json({ error: "Source controls unavailable" }, { status: 503, headers });
        }
        return Response.json(
          ids
            ? { version: 2, sources_complete: true, requested_source_ids: ids, ...data }
            : { version: 1, sources: data.sources, pending_review: data.pending_review },
          { headers },
        );
      },
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
          body = researchIntakeEnvelope.parse(JSON.parse(raw));
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
