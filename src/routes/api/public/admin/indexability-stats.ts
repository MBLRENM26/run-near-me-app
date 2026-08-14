import { createFileRoute } from "@tanstack/react-router";
import {
  computeIndexability,
  normaliseEventName,
  type IndexabilityInput,
  type IndexabilityResult,
} from "@/lib/event-indexability";

type Row = IndexabilityInput;

export const Route = createFileRoute("/api/public/admin/indexability-stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }
        const provided = request.headers.get("x-admin-secret");
        if (!provided || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date().toISOString().slice(0, 10);

        // Page through ALL ACTIVE events (including past — we want to count
        // the "past" reason). Mirrors the column set used by
        // getIndexableEventSlugsForSitemap.
        const rows: Row[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabaseAdmin
            .from("events")
            .select("id, slug, name, sort_date, entry_url, organiser_url, organiser")
            .eq("status", "ACTIVE")
            .not("slug", "is", null)
            .range(from, from + pageSize - 1);
          if (error) {
            return Response.json({ error: `Query failed: ${error.message}` }, { status: 500 });
          }
          const batch = (data ?? []) as Row[];
          rows.push(...batch);
          if (batch.length < pageSize) break;
        }

        // Group siblings by normalised name (matches sitemap logic). Full
        // rows so sibling eligibility is evaluated consistently.
        const siblingsByName = new Map<string, Row[]>();
        for (const r of rows) {
          const key = normaliseEventName(r.name);
          const list = siblingsByName.get(key);
          if (list) list.push(r);
          else siblingsByName.set(key, [r]);
        }

        const noindex_by_reason: Record<string, number> = {
          past: 0,
          "slug-suffix-duplicate": 0,
          orphan: 0,
          "duplicate-sibling": 0,
        };
        let indexable = 0;

        for (const r of rows) {
          const siblings = siblingsByName.get(normaliseEventName(r.name)) ?? [];
          const result: IndexabilityResult = computeIndexability(r, siblings, today);
          if (result.indexable) {
            indexable++;
          } else if (result.reason) {
            noindex_by_reason[result.reason] = (noindex_by_reason[result.reason] ?? 0) + 1;
          }
        }

        return Response.json({
          today,
          total: rows.length,
          indexable,
          noindex_total: rows.length - indexable,
          noindex_by_reason,
        });
      },
    },
  },
});
