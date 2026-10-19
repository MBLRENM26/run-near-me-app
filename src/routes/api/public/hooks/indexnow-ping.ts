import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { SITE_URL } from "@/lib/site";
import { monthSlugFromKey } from "@/lib/month-slug";
import type { MonthKey } from "@/lib/month-filter";

// Daily: tell IndexNow (Bing etc.) about upcoming races changed in the last
// 26h plus the monthly lists they appear on. Only public, upcoming events.

const MONTH_LIST_PREFIXES = ["running-events", "5k-races", "10k-races", "half-marathons", "marathons", "ultra-marathons"];

function isAuthorized(request: Request): boolean {
  const secret = process.env.IMPORT_SECRET;
  const provided = request.headers.get("x-admin-secret");
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/indexnow-ping")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { pingIndexNow } = await import("@/lib/indexnow.server");
        const since = new Date(Date.now() - 26 * 3600_000).toISOString();
        const today = new Date().toISOString().slice(0, 10);
        const { data: changed, error: e1 } = await supabaseAdmin
          .from("events")
          .select("slug")
          .gte("updated_at", since)
          .gte("sort_date", today)
          .not("slug", "is", null)
          .limit(2000);
        if (e1) return Response.json({ error: e1.message }, { status: 500 });
        const slugs = (changed ?? []).map((r) => r.slug as string);
        // Only ping pages that are actually public.
        const { data, error } = slugs.length
          ? await (supabaseAdmin as any).from("events_public_v1").select("slug, sort_date").in("slug", slugs.slice(0, 500))
          : { data: [], error: null };
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const urls: string[] = [];
        const months = new Set<string>();
        for (const e of (data ?? []) as { slug: string | null; sort_date: string | null }[]) {
          if (e.slug) urls.push(`${SITE_URL}/events/${e.slug}`);
          if (e.sort_date) months.add(e.sort_date.slice(0, 7));
        }
        for (const m of months) {
          const slug = monthSlugFromKey(m as MonthKey);
          for (const p of MONTH_LIST_PREFIXES) urls.push(`${SITE_URL}/${p}/${slug}`);
        }
        if (urls.length) urls.push(`${SITE_URL}/running-events-this-weekend`, `${SITE_URL}/sitemap.xml`);
        const result = await pingIndexNow(urls);
        return Response.json({ events: data?.length ?? 0, months: months.size, ...result });
      },
    },
  },
});
