import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withUsageLogging } from "../usage";
import { createClient } from "@supabase/supabase-js";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";
import { SITE_URL } from "@/lib/site";

export default defineTool({
  name: "search_events",
  title: "Search UK running events",
  description:
    "Search upcoming UK running events by keyword, region, distance tag (5k, 10k, half-marathon, marathon, ultra), terrain tag (road, trail, fell, multi-terrain), or month (YYYY-MM). Returns active events only, filtered to those with an organiser-owned link (never aggregator-only listings).",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Free-text match against event name or town."),
    region: z
      .string()
      .trim()
      .optional()
      .describe("UK region, e.g. 'South East', 'Scotland', 'Wales'."),
    distance_tag: z
      .string()
      .trim()
      .optional()
      .describe("Distance tag: 5k, 10k, half-marathon, marathon, ultra."),
    terrain_tag: z
      .string()
      .trim()
      .optional()
      .describe("Terrain tag: road, trail, fell, multi-terrain, parkrun."),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("Month filter as YYYY-MM."),
    limit: z.number().int().min(1).max(50).optional().default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withUsageLogging("search_events", async (input) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let q = supabase
      .from("events")
      .select(DISCOVERY_EVENT_COLUMNS)
      .eq("status", "ACTIVE")
      .or(UK_BOUNDS_OR_NULL)
      .gte("sort_date", new Date().toISOString().slice(0, 10))
      .order("sort_date", { ascending: true })
      .limit(Math.min(input.limit ?? 20, 50) * 3); // over-fetch, filter below

    if (input.query) q = q.or(`name.ilike.%${input.query}%,town.ilike.%${input.query}%`);
    if (input.region) q = q.ilike("region", input.region);
    if (input.distance_tag) q = q.contains("distance_tags", [input.distance_tag]);
    if (input.terrain_tag) q = q.contains("terrain_tags", [input.terrain_tag]);
    if (input.month) {
      const start = `${input.month}-01`;
      const [y, m] = input.month.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      q = q.gte("sort_date", start).lt("sort_date", nextMonth);
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Query failed: ${error.message}` }], isError: true };
    }

    const rows = (data ?? [])
      .filter((r: any) => hasOrganiserOwnedLink(r.entry_url, r.organiser_url))
      .slice(0, input.limit ?? 20)
      .map((r: any) => ({
        slug: r.slug,
        name: r.name,
        date: r.date_raw ?? r.sort_date,
        town: r.town,
        region: r.region,
        distances: r.distances,
        distance_tags: r.distance_tags,
        terrain_tags: r.terrain_tags,
        url: `${SITE_URL}/events/${r.slug}`,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: rows.length, events: rows }, null, 2) }],
      structuredContent: { count: rows.length, events: rows },
    };
  }),
});
