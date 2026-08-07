import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasDiscoverableLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS } from "@/lib/events-query";
import { sortEstimatedLastWithinMonth } from "@/lib/month-filter";
import { CITIES, CITY_RADIUS_KM, cityBySlug, haversineKm } from "@/lib/cities";
import type { CityConfig } from "@/lib/cities";
import { DISTANCE_PAGE_LIST, matchesDistance, type DistanceKey } from "@/lib/distance-filters";
import type { DistanceEvent } from "@/lib/events.functions";

/** City-page threshold: fewer than this and we don't publish the page. */
export const CITY_MIN_EVENTS = 10;

export type CityPageData = {
  events: DistanceEvent[];
  total: number;
  city: CityConfig;
  distanceCounts: Partial<Record<DistanceKey, number>>;
};

const inputSchema = z.object({
  slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
});

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
  lat: number | null;
  lng: number | null;
};

/**
 * Bounding-box + exact haversine filter for events near a city.
 * Runs the two-step filter described in the SEO expansion plan:
 * 1. Cheap SQL bounding box (25 km ≈ 0.225° lat, Δlng scales by cos(lat)).
 * 2. Exact haversine in JS on the ~few-hundred returned rows.
 */
async function fetchEventsNearCity(city: CityConfig): Promise<{
  events: DistanceEvent[];
  raw: Row[];
}> {
  const today = new Date().toISOString().slice(0, 10);
  const dLat = CITY_RADIUS_KM / 111; // ≈0.225 for 25 km
  const cosLat = Math.max(Math.cos((city.lat * Math.PI) / 180), 0.0001);
  const dLng = dLat / cosLat;

  const minLat = city.lat - dLat;
  const maxLat = city.lat + dLat;
  const minLng = city.lng - dLng;
  const maxLng = city.lng + dLng;

  const all: Row[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: rows, error } = await supabaseAdmin
      .from("events_public_v1")
      .select(`${DISCOVERY_EVENT_COLUMNS}, lat, lng`)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .or(`sort_date.gte.${today},sort_date.is.null`)
      .order("sort_date", { ascending: true, nullsFirst: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const r = (rows ?? []) as Row[];
    all.push(...r);
    if (r.length < pageSize) break;
  }

  const inRadius = all.filter((r) => {
    if (r.lat == null || r.lng == null) return false;
    return haversineKm(city.lat, city.lng, r.lat, r.lng) <= CITY_RADIUS_KM;
  });

  const trusted = inRadius.filter((e) =>
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

  return { events: sortEstimatedLastWithinMonth(events), raw: trusted };
}

/** Bucket events into distance chips. One event can count against multiple keys. */
function bucketDistances(rows: Pick<Row, "distances">[]): Partial<Record<DistanceKey, number>> {
  const counts: Partial<Record<DistanceKey, number>> = {};
  for (const cfg of DISTANCE_PAGE_LIST) {
    let n = 0;
    for (const r of rows) if (matchesDistance(r.distances, cfg)) n += 1;
    if (n > 0) counts[cfg.key] = n;
  }
  return counts;
}

export const getEventsForCity = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<CityPageData | null> => {
    const city = cityBySlug(data.slug);
    if (!city) return null;

    const { events, raw } = await fetchEventsNearCity(city);
    if (events.length < CITY_MIN_EVENTS) return null;

    return {
      events,
      total: events.length,
      city,
      distanceCounts: bucketDistances(raw),
    };
  });

/**
 * City counts for the sitemap. Runs one bulk scan of geocoded active
 * events and buckets them into every city in the registry — cheaper than
 * one round-trip per city. Only used by the sitemap (hourly cache).
 */
export const getCityEventCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<{ slug: string; name: string; total: number }>> => {
    const today = new Date().toISOString().slice(0, 10);

    const all: Row[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events_public_v1")
        .select(`${DISCOVERY_EVENT_COLUMNS}, lat, lng`)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const r = (rows ?? []) as Row[];
      all.push(...r);
      if (r.length < pageSize) break;
    }

    const trusted = all.filter((e) =>
      hasDiscoverableLink(e.entry_url, e.organiser_url, e.governance),
    );

    const out: Array<{ slug: string; name: string; total: number }> = [];
    for (const city of CITIES) {
      let n = 0;
      for (const r of trusted) {
        if (r.lat == null || r.lng == null) continue;
        if (haversineKm(city.lat, city.lng, r.lat, r.lng) <= CITY_RADIUS_KM) n += 1;
      }
      if (n >= CITY_MIN_EVENTS) {
        out.push({ slug: city.slug, name: city.name, total: n });
      }
    }
    out.sort((a, b) => b.total - a.total);
    return out;
  },
);
