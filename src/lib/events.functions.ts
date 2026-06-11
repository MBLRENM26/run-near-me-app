import { createServerFn } from "@tanstack/react-start";
import { notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DISTANCE_PAGES,
  DISTANCE_PAGE_LIST,
  matchesDistance,
  primaryDistanceKey,
  type DistanceKey,
} from "@/lib/distance-filters";
import {
  distanceKeyToTagQuery,
  eventMatchesDistanceKey,
  primaryDistanceKeyFromTags,
} from "@/lib/event-tags";
import { REGIONS, slugToRegion } from "@/lib/regions";
import { sortEstimatedLastWithinMonth } from "@/lib/month-filter";

// During the transition window, an event matches a distance page if its
// parsed tag arrays match OR (for un-backfilled rows with empty tags) the
// legacy substring matcher on `distances` matches. Once every row has been
// run through the parser the substring branch becomes dead code.
function rowMatchesDistanceKey(
  row: {
    distances: string | null;
    distance_tags: string[] | null;
    terrain_tags: string[] | null;
  },
  key: DistanceKey,
): boolean {
  const hasTags =
    (row.distance_tags?.length ?? 0) + (row.terrain_tags?.length ?? 0) > 0;
  if (hasTags) return eventMatchesDistanceKey(row, key);
  return matchesDistance(row.distances, DISTANCE_PAGES[key]);
}

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
  date_is_estimated: boolean;
};

export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<EventDetail> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, date_raw, date_from, date_to, sort_date, town, county, region, distances, discipline, entry_fee, entry_url, organiser_url, source_url, organiser, is_featured, date_is_estimated",
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

export const lookupEventSlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<{ exists: boolean }> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("slug")
      .eq("slug", data.slug)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { exists: !!row };
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
  date_is_estimated: boolean;
};

export type DistancePageData = {
  events: DistanceEvent[]; // capped for display
  regionCounts: { region: string; count: number }[];
  total: number;
};

// Cap kept generous so client-side month filtering has events to work with.
const DISPLAY_LIMIT = 500;

export const getEventsByDistance = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => distanceKeySchema.parse(input))
  .handler(async ({ data }): Promise<DistancePageData> => {
    const cfg = DISTANCE_PAGES[data.distanceKey as DistanceKey];
    const today = new Date().toISOString().slice(0, 10);

    // Fetch all active future events with a non-null distances field, then
    // filter in JS. The tag-based matcher is exact; the legacy substring
    // fallback only fires for rows whose tags haven't been backfilled yet.
    const pageSize = 1000;
    const all: DistanceEvent[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, source_url, is_featured, date_is_estimated",
        )
        .eq("status", "ACTIVE")
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(
          "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
        )
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        const match = rowMatchesDistanceKey(
          {
            distances: r.distances as string | null,
            distance_tags: r.distance_tags as string[] | null,
            terrain_tags: r.terrain_tags as string[] | null,
          },
          cfg.key,
        );
        if (match) {
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
            date_is_estimated: !!r.date_is_estimated,
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

    const sorted = sortEstimatedLastWithinMonth(all);

    return {
      events: sorted.slice(0, DISPLAY_LIMIT),
      regionCounts,
      total: all.length,
    };
  });

// ----- Region × distance combo pages -----

const regionDistanceSchema = z.object({
  regionSlug: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
  distanceKey: z.enum([
    "5k",
    "10k",
    "half-marathon",
    "marathon",
    "trail",
    "ultra",
  ]),
});

export type RegionDistancePageData = {
  events: DistanceEvent[]; // capped for display
  total: number;
  // Counts for the other 5 distances in the SAME region (drives the
  // "other distances in {region}" panel).
  otherDistanceCounts: Record<DistanceKey, number>;
};

export const getEventsByRegionAndDistance = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => regionDistanceSchema.parse(input))
  .handler(async ({ data }): Promise<RegionDistancePageData> => {
    const region = slugToRegion(data.regionSlug);
    if (!region) throw notFound();
    const cfg = DISTANCE_PAGES[data.distanceKey as DistanceKey];
    const today = new Date().toISOString().slice(0, 10);

    // Pull all active future events for this region with a non-null
    // distances field — volume per region is small.
    const pageSize = 1000;
    type RowWithTags = DistanceEvent & {
      _distance_tags: string[] | null;
      _terrain_tags: string[] | null;
    };
    const all: RowWithTags[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, source_url, is_featured, date_is_estimated",
        )
        .eq("status", "ACTIVE")
        .eq("region", region.name)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(
          "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
        )
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
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
          date_is_estimated: !!r.date_is_estimated,
          _distance_tags: r.distance_tags as string[] | null,
          _terrain_tags: r.terrain_tags as string[] | null,
        });
      }
      if (rows.length < pageSize) break;
    }

    const rowMatches = (e: RowWithTags, key: DistanceKey) =>
      rowMatchesDistanceKey(
        {
          distances: e.distance_type,
          distance_tags: e._distance_tags,
          terrain_tags: e._terrain_tags,
        },
        key,
      );

    // Bucket the same fetched rows by every distance for the
    // "other distances in this region" panel.
    const otherDistanceCounts: Record<DistanceKey, number> = {
      "5k": 0,
      "10k": 0,
      "half-marathon": 0,
      marathon: 0,
      trail: 0,
      ultra: 0,
    };
    for (const e of all) {
      for (const p of DISTANCE_PAGE_LIST) {
        if (rowMatches(e, p.key)) otherDistanceCounts[p.key]++;
      }
    }

    const matched = sortEstimatedLastWithinMonth(
      all.filter((e) => rowMatches(e, cfg.key)),
    );

    // Drop the private tag fields before returning.
    const events = matched.slice(0, DISPLAY_LIMIT).map((e) => {
      const { _distance_tags, _terrain_tags, ...rest } = e;
      void _distance_tags;
      void _terrain_tags;
      return rest;
    });

    return {
      events,
      total: matched.length,
      otherDistanceCounts,
    };
  });


export type RegionDistanceMatrixRow = {
  regionSlug: string;
  regionName: string;
  distanceKey: DistanceKey;
  distanceSlug: string;
  total: number;
};

export const getRegionDistanceMatrix = createServerFn({ method: "GET" })
  .handler(async (): Promise<RegionDistanceMatrixRow[]> => {
    const today = new Date().toISOString().slice(0, 10);
    const pageSize = 1000;

    // Pull every active future event with a region + distances in one pass.
    const rows: { region: string; distances: string }[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("region, distances")
        .eq("status", "ACTIVE")
        .not("distances", "is", null)
        .not("region", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(
          "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
        )
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      for (const r of data) {
        if (r.region && r.distances) {
          rows.push({ region: r.region as string, distances: r.distances as string });
        }
      }
      if (data.length < pageSize) break;
    }

    const counts = new Map<string, number>();
    for (const r of rows) {
      for (const p of DISTANCE_PAGE_LIST) {
        if (matchesDistance(r.distances, p)) {
          const key = `${r.region}::${p.key}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }

    const out: RegionDistanceMatrixRow[] = [];
    for (const region of REGIONS) {
      for (const p of DISTANCE_PAGE_LIST) {
        out.push({
          regionSlug: region.slug,
          regionName: region.name,
          distanceKey: p.key,
          distanceSlug: p.slug,
          total: counts.get(`${region.name}::${p.key}`) ?? 0,
        });
      }
    }
    return out;
  });

// ----- Event detail page (event + related events in one call) -----

export type RelatedEvent = {
  id: string;
  slug: string;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  date_is_estimated: boolean;
  town: string | null;
  county: string | null;
  /** Miles from the current event when sourced via nearest-by-radius. */
  distance_miles?: number | null;
};

export type RelatedEvents = {
  /** Up to 6 upcoming events, same region + same distance bucket when possible. */
  events: RelatedEvent[];
  /** Live count of upcoming same-distance (or all, when unbucketed) events in the region. */
  totalCount: number;
  /** Distance bucket the count/list was filtered by, or null when unbucketed. */
  distanceKey: DistanceKey | null;
};

export type EventPageData = {
  event: EventDetail;
  related: RelatedEvents;
};

export const getEventPageData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<EventPageData> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, date_raw, date_from, date_to, sort_date, town, county, region, distances, discipline, entry_fee, entry_url, organiser_url, source_url, organiser, is_featured, date_is_estimated, lat, lng",
      )
      .eq("slug", data.slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) {
      // Retired duplicate listing? Permanently redirect to the survivor.
      const { data: dup } = await supabaseAdmin
        .from("events")
        .select("duplicate_of")
        .eq("slug", data.slug)
        .eq("status", "DUPLICATE")
        .not("duplicate_of", "is", null)
        .maybeSingle();
      if (dup?.duplicate_of) {
        const { data: survivor } = await supabaseAdmin
          .from("events")
          .select("slug")
          .eq("id", dup.duplicate_of as string)
          .eq("status", "ACTIVE")
          .maybeSingle();
        if (survivor?.slug) {
          throw redirect({
            to: "/events/$slug",
            params: { slug: survivor.slug as string },
            statusCode: 301,
          });
        }
      }
      throw notFound();
    }
    const eventRow = row as EventDetail & { lat: number | null; lng: number | null };
    const { lat: eventLat, lng: eventLng, ...eventPublic } = eventRow;
    const event = eventPublic as EventDetail;

    const related: RelatedEvents = {
      events: [],
      totalCount: 0,
      distanceKey: primaryDistanceKey(event.distances),
    };

    if (event.region) {
      const today = new Date().toISOString().slice(0, 10);
      const pageSize = 1000;
      type Row = RelatedEvent & { distances: string | null };
      const all: Row[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data: rows, error: relErr } = await supabaseAdmin
          .from("events")
          .select(
            "id, slug, name, date_raw, sort_date, date_is_estimated, town, county, distances",
          )
          .eq("status", "ACTIVE")
          .eq("region", event.region)
          .not("slug", "is", null)
          .or(`sort_date.gte.${today},sort_date.is.null`)
          .or(
            "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
          )
          .order("sort_date", { ascending: true, nullsFirst: false })
          .range(from, from + pageSize - 1);
        if (relErr) throw new Error(relErr.message);
        if (!rows || rows.length === 0) break;
        for (const r of rows) {
          all.push({
            id: r.id as string,
            slug: r.slug as string,
            name: r.name as string,
            date_raw: r.date_raw as string | null,
            sort_date: r.sort_date as string | null,
            date_is_estimated: !!r.date_is_estimated,
            town: r.town as string | null,
            county: r.county as string | null,
            distances: r.distances as string | null,
          });
        }
        if (rows.length < pageSize) break;
      }

      const cfg = related.distanceKey
        ? DISTANCE_PAGES[related.distanceKey]
        : null;
      const matched = cfg
        ? all.filter((r) => matchesDistance(r.distances, cfg))
        : all;

      // Count includes the event itself (drives the "one of N" prose and the
      // "View all N" footer link — both region+distance scoped).
      related.totalCount = matched.length;
      related.events = matched
        .filter((r) => r.id !== event.id)
        .slice(0, 6)
        .map(({ distances: _d, ...rest }) => rest);
    }

    // Prefer nearest-by-radius for the displayed 6 when we have coordinates.
    // totalCount stays region+distance scoped (that's what the prose says).
    if (eventLat != null && eventLng != null) {
      const cfg = related.distanceKey
        ? DISTANCE_PAGES[related.distanceKey]
        : null;
      for (const radius of [25, 75, 200]) {
        const { data: nearRows, error: nearErr } = await supabaseAdmin.rpc(
          "events_within_radius",
          {
            p_lat: eventLat,
            p_lng: eventLng,
            p_radius_miles: radius,
            p_max_results: 100,
          },
        );
        if (nearErr) break; // fall back to region list silently
        if (!nearRows) continue;
        const picked: RelatedEvent[] = [];
        for (const r of nearRows as Array<{
          id: string;
          slug: string | null;
          name: string;
          date_raw: string | null;
          town: string | null;
          county: string | null;
          distance_type: string | null;
          date_is_estimated: boolean | null;
          distance_miles: number | null;
        }>) {
          if (!r.slug || r.id === event.id) continue;
          if (cfg && !matchesDistance(r.distance_type, cfg)) continue;
          picked.push({
            id: r.id,
            slug: r.slug,
            name: r.name,
            date_raw: r.date_raw,
            sort_date: null,
            date_is_estimated: !!r.date_is_estimated,
            town: r.town,
            county: r.county,
            distance_miles: r.distance_miles,
          });
          if (picked.length >= 6) break;
        }
        if (picked.length >= 6 || radius === 200) {
          if (picked.length > 0) related.events = picked;
          break;
        }
      }
    }

    return { event, related };
  });

