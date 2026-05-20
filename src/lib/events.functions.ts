import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DISTANCE_PAGES,
  DISTANCE_PAGE_LIST,
  matchesDistance,
  type DistanceKey,
} from "@/lib/distance-filters";
import { REGIONS, slugToRegion } from "@/lib/regions";

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

// ----- Distance landing pages -----

const distanceKeySchema = z.object({
  distanceKey: z.enum([
    "5k",
    "10k",
    "half-marathon",
    "marathon",
    "trail",
    "ultra",
  ]),
});

export type DistanceEvent = {
  id: string;
  slug: string | null;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  town: string | null;
  county: string | null;
  region: string | null;
  distance_type: string | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  source_url: string | null;
  is_featured: boolean;
};

export type DistancePageData = {
  events: DistanceEvent[]; // capped for display
  regionCounts: { region: string; count: number }[];
  total: number;
};

const DISPLAY_LIMIT = 60;

export const getEventsByDistance = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => distanceKeySchema.parse(input))
  .handler(async ({ data }): Promise<DistancePageData> => {
    const cfg = DISTANCE_PAGES[data.distanceKey as DistanceKey];
    const today = new Date().toISOString().slice(0, 10);

    // Fetch all active future events with a non-null distances field, then
    // filter in JS — the matcher logic is too messy to express cleanly in
    // chained Supabase .or/.not calls and total volume is small.
    const pageSize = 1000;
    const all: DistanceEvent[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, town, county, region, distances, entry_fee, entry_url, organiser_url, source_url, is_featured",
        )
        .eq("status", "ACTIVE")
        .not("distances", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(
          "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
        )
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        if (matchesDistance(r.distances as string | null, cfg)) {
          all.push({
            id: r.id as string,
            slug: r.slug as string | null,
            name: r.name as string,
            date_raw: r.date_raw as string | null,
            sort_date: r.sort_date as string | null,
            town: r.town as string | null,
            county: r.county as string | null,
            region: r.region as string | null,
            distance_type: r.distances as string | null,
            entry_fee: r.entry_fee as string | null,
            entry_url: r.entry_url as string | null,
            organiser_url: r.organiser_url as string | null,
            source_url: r.source_url as string | null,
            is_featured: !!r.is_featured,
          });
        }
      }
      if (rows.length < pageSize) break;
    }

    // Group by region for the regional breakdown section.
    const counts = new Map<string, number>();
    for (const e of all) {
      if (e.region) counts.set(e.region, (counts.get(e.region) ?? 0) + 1);
    }
    const regionCounts = Array.from(counts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      events: all.slice(0, DISPLAY_LIMIT),
      regionCounts,
      total: all.length,
    };
  });
