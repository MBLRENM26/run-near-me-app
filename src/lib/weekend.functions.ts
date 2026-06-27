import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { getWeekendRange, type WeekendWhich, type WeekendRange } from "@/lib/weekend";
import type { DistanceEvent } from "@/lib/events.functions";

export type WeekendPageData = {
  events: DistanceEvent[];
  total: number;
  range: WeekendRange;
};

const whichSchema = z.object({
  which: z.enum(["this", "next"]),
});

export const getEventsForWeekend = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => whichSchema.parse(input))
  .handler(async ({ data }): Promise<WeekendPageData> => {
    const which = data.which as WeekendWhich;
    const range = getWeekendRange(which);

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
    };

    const { data: rows, error } = await supabaseAdmin
      .from("events")
      .select(DISCOVERY_EVENT_COLUMNS)
      .eq("status", "ACTIVE")
      .gte("sort_date", range.satISO)
      .lte("sort_date", range.sunISO)
      .or(UK_BOUNDS_OR_NULL)
      .order("sort_date", { ascending: true, nullsFirst: false })
      .limit(1000);

    if (error) throw new Error(error.message);

    const all = (rows ?? []) as Row[];
    const trusted = all.filter((e) =>
      hasOrganiserOwnedLink(e.entry_url, e.organiser_url),
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
    }));

    return { events, total: events.length, range };
  });
