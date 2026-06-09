import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { regionFromCoords, type UKRegionSlug } from "@/lib/region-from-coords";

export type ParkrunVariant = "adult" | "junior";

export interface ParkrunLocation {
  id: string;
  slug: string;
  name: string;
  distance: string | null; // "5K" or "2K"
  variant: ParkrunVariant;
  lat: number | null;
  lng: number | null;
  organiserUrl: string | null;
  regionSlug: UKRegionSlug | null;
}

export interface ParkrunListData {
  locations: ParkrunLocation[];
  regionCounts: { regionSlug: UKRegionSlug; count: number }[];
  total: number;
  adultCount: number;
  juniorCount: number;
}

function variantOf(name: string, distance: string | null): ParkrunVariant {
  const n = name.toLowerCase();
  if (n.includes("junior")) return "junior";
  if (distance && /^\s*2\s*k/i.test(distance)) return "junior";
  return "adult";
}

async function fetchAll(): Promise<ParkrunLocation[]> {
  const pageSize = 1000;
  const out: ParkrunLocation[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id, slug, name, distances, lat, lng, organiser_url")
      .eq("status", "ACTIVE")
      .ilike("name", "%parkrun%")
      .not("slug", "is", null)
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const name = r.name as string;
      const distance = (r.distances as string | null)?.trim() || null;
      out.push({
        id: r.id as string,
        slug: r.slug as string,
        name,
        distance,
        variant: variantOf(name, distance),
        lat: r.lat as number | null,
        lng: r.lng as number | null,
        organiserUrl: (r.organiser_url as string | null)?.trim() || null,
        regionSlug: regionFromCoords(r.lat as number | null, r.lng as number | null),
      });
    }
    if (data.length < pageSize) break;
  }
  return out;
}

function buildList(
  all: ParkrunLocation[],
  variant: ParkrunVariant | "all",
): ParkrunListData {
  const filtered =
    variant === "all" ? all : all.filter((l) => l.variant === variant);
  const counts = new Map<UKRegionSlug, number>();
  for (const l of filtered) {
    if (l.regionSlug)
      counts.set(l.regionSlug, (counts.get(l.regionSlug) ?? 0) + 1);
  }
  const regionCounts = Array.from(counts.entries())
    .map(([regionSlug, count]) => ({ regionSlug, count }))
    .sort((a, b) => b.count - a.count);
  return {
    locations: filtered,
    regionCounts,
    total: filtered.length,
    adultCount: all.filter((l) => l.variant === "adult").length,
    juniorCount: all.filter((l) => l.variant === "junior").length,
  };
}

const variantSchema = z.object({
  variant: z.enum(["adult", "junior", "all"]),
});

export const getParkrunList = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => variantSchema.parse(input))
  .handler(async ({ data }): Promise<ParkrunListData> => {
    const all = await fetchAll();
    return buildList(all, data.variant);
  });

const regionSchema = z.object({
  region: z.string().min(1).max(64).regex(/^[a-z-]+$/),
  variant: z.enum(["adult", "junior", "all"]).default("all"),
});

export const getParkrunsByRegion = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => regionSchema.parse(input))
  .handler(async ({ data }): Promise<ParkrunListData> => {
    const all = await fetchAll();
    const filtered = all.filter((l) => l.regionSlug === data.region);
    return buildList(filtered, data.variant);
  });

const slugSchema = z.object({
  slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/),
});

export interface ParkrunDetail extends ParkrunLocation {
  town: string | null;
  county: string | null;
  nearby: (ParkrunLocation & { distanceMiles: number })[];
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const getParkrunBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<ParkrunDetail> => {
    const all = await fetchAll();
    const me = all.find((l) => l.slug === data.slug);
    if (!me) throw notFound();

    // Location fields for SEO title/description and JSON-LD address.
    const { data: locRow } = await supabaseAdmin
      .from("events")
      .select("town, county")
      .eq("id", me.id)
      .maybeSingle();
    const town = (locRow?.town as string | null)?.trim() || null;
    const county = (locRow?.county as string | null)?.trim() || null;

    let nearby: (ParkrunLocation & { distanceMiles: number })[] = [];
    if (me.lat != null && me.lng != null) {
      nearby = all
        .filter((l) => l.id !== me.id && l.lat != null && l.lng != null)
        .map((l) => ({
          ...l,
          distanceMiles: haversineMiles(me.lat!, me.lng!, l.lat!, l.lng!),
        }))
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, 5);
    }
    return { ...me, town, county, nearby };
  });
