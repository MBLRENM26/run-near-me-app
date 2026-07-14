import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasDiscoverableLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { sortEstimatedLastWithinMonth } from "@/lib/month-filter";
import type { DistanceEvent } from "@/lib/events.functions";
import type { TerrainTag } from "@/lib/event-tags";

export type TerrainHubData = {
  events: DistanceEvent[];
  total: number;
  regionCounts: { region: string; count: number }[];
};

const inputSchema = z.object({
  terrain: z.enum(["road", "trail", "multi-terrain", "fell"]),
});

const DISPLAY_LIMIT = 500;

export const getEventsByTerrain = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<TerrainHubData> => {
    const terrain = data.terrain as TerrainTag;
    const today = new Date().toISOString().slice(0, 10);

    type Row = {
      id: string;
      slug: string | null;
      name: string;
      date_raw: string | null;
      sort_date: string | null;
      town: string | null;
      county: string | null;
      region: string | null;
      distances: string | null;
      distance_tags: string[] | null;
      terrain_tags: string[] | null;
      entry_fee: string | null;
      entry_url: string | null;
      organiser_url: string | null;
      is_featured: boolean | null;
      date_is_estimated: boolean | null;
      is_recurring: boolean | null;
      governance: string | null;
    };

    const all: Row[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(DISCOVERY_EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .contains("terrain_tags", [terrain])
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(UK_BOUNDS_OR_NULL)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const r = (rows ?? []) as Row[];
      all.push(...r);
      if (r.length < pageSize) break;
    }

    const trusted = all.filter((e) =>
      hasDiscoverableLink(e.entry_url, e.organiser_url, e.governance),
    );

    const events: DistanceEvent[] = trusted.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      date_raw: r.date_raw,
      sort_date: r.sort_date,
      town: r.town,
      county: r.county,
      region: r.region,
      distance_type: r.distances,
      entry_fee: r.entry_fee,
      entry_url: r.entry_url,
      organiser_url: r.organiser_url,
      is_featured: !!r.is_featured,
      date_is_estimated: !!r.date_is_estimated,
      is_recurring: !!r.is_recurring,
      governance: r.governance,
    }));

    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.region) counts.set(e.region, (counts.get(e.region) ?? 0) + 1);
    }
    const regionCounts = Array.from(counts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    const sorted = sortEstimatedLastWithinMonth(events);
    return {
      events: sorted.slice(0, DISPLAY_LIMIT),
      total: events.length,
      regionCounts,
    };
  });
