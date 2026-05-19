import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const slugSchema = z.object({
  slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/),
});

export type EventDetail = {
  id: string;
  slug: string;
  name: string;
  date_raw: string | null;
  date_from: string | null;
  date_to: string | null;
  sort_date: string | null;
  town: string | null;
  county: string | null;
  region: string | null;
  distances: string | null;
  discipline: string | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  source_url: string | null;
  organiser: string | null;
  is_featured: boolean;
};

export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<EventDetail> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, date_raw, date_from, date_to, sort_date, town, county, region, distances, discipline, entry_fee, entry_url, organiser_url, source_url, organiser, is_featured",
      )
      .eq("slug", data.slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw notFound();
    return row as EventDetail;
  });

export const getAllActiveSlugs = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ slug: string; sort_date: string | null }[]> => {
    const pageSize = 1000;
    const all: { slug: string; sort_date: string | null }[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("slug, sort_date")
        .eq("status", "ACTIVE")
        .not("slug", "is", null)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      all.push(...(data as { slug: string; sort_date: string | null }[]));
      if (data.length < pageSize) break;
    }
    return all;
  });
