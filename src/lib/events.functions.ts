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
import {
  computeIndexability,
  normaliseEventName,
  slugStem,
  type IndexabilityResult,
} from "@/lib/event-indexability";
import { hasOrganiserOwnedLink, hasDiscoverableLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";

/**
 * Run a Supabase select in 1000-row pages until exhausted, returning all
 * rows. The caller builds the query inside `build(from, to)` so it can
 * apply any `.eq` / `.or` / `.order` it needs. Pure scaffolding extraction
 * — replaces five copies of the same `for (let from = 0; ;)` loop.
 */
async function fetchAllRows<T>(
  build: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

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
  distance_tags: string[] | null;
  terrain_tags: string[] | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  // source_url intentionally NOT exposed publicly — stays in DB for provenance
  // and admin views only. Shipping it to the client puts the original
  // aggregator domain in the SSR hydration JSON, where scrapers + Google's
  // cache can pick it up. See mem://constraints/no-source-attribution.
  organiser: string | null;
  is_featured: boolean;
  date_is_estimated: boolean;
  governance: string | null;
  organiser_type: string | null;
  race_profile: string | null;
  created_at: string | null;
  norm_created_at: string | null;
};

export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<EventDetail> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, date_raw, date_from, date_to, sort_date, town, county, region, distances, discipline, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, organiser, is_featured, date_is_estimated, governance, organiser_type, race_profile",
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
    return fetchAllRows<{ slug: string; sort_date: string | null }>((from, to) =>
      supabaseAdmin
        .from("events")
        .select("slug, sort_date")
        .eq("status", "ACTIVE")
        .not("slug", "is", null)
        .range(from, to),
    );
  });

/**
 * Returns ACTIVE event slugs that pass the same indexability rules used
 * by `<meta robots>` on `/events/{slug}` (see src/lib/event-indexability.ts).
 *
 * Used by the sitemap so we only ask Google to crawl URLs we'd actually
 * index. Filters out: past events, slug-suffix duplicates (-race-N,
 * -{month}, dated suffixes), orphans (no link AND no organiser), and
 * series duplicates that aren't the earliest upcoming sibling.
 */
export const getIndexableEventSlugsForSitemap = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ slug: string; sort_date: string | null }[]> => {
    const today = new Date().toISOString().slice(0, 10);

    type Row = {
      id: string;
      slug: string;
      name: string;
      sort_date: string | null;
      entry_url: string | null;
      organiser_url: string | null;
      organiser: string | null;
    };

    const rows = await fetchAllRows<Row>((from, to) =>
      supabaseAdmin
        .from("events")
        .select("id, slug, name, sort_date, entry_url, organiser_url, organiser")
        .eq("status", "ACTIVE")
        .not("slug", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .range(from, to),
    );

    // Group siblings by normalised name so computeIndexability can decide
    // duplicate-sibling status. Each event appears in its own group.
    const siblingsByName = new Map<string, { id: string; sort_date: string | null }[]>();
    for (const r of rows) {
      const key = normaliseEventName(r.name);
      const list = siblingsByName.get(key);
      const entry = { id: r.id, sort_date: r.sort_date };
      if (list) list.push(entry);
      else siblingsByName.set(key, [entry]);
    }

    return rows
      .filter((r) => {
        const siblings = siblingsByName.get(normaliseEventName(r.name)) ?? [];
        const result = computeIndexability(r, siblings, today);
        return result.indexable;
      })
      .map((r) => ({ slug: r.slug, sort_date: r.sort_date }));
  });


export const lookupEventSlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<{ exists: boolean }> => {
    // Past events deliberately excluded: this fn powers the legacy flat-URL
    // catch-all `/$slug` redirect. Redirecting past slugs into the real
    // event route feeds soft-404 candidates back into Google's crawl queue.
    // Direct visits to `/events/{slug}` still serve the page (with a
    // noindex meta — see src/lib/event-indexability.ts).
    const today = new Date().toISOString().slice(0, 10);
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("slug")
      .eq("slug", data.slug)
      .eq("status", "ACTIVE")
      .or(`sort_date.gte.${today},sort_date.is.null`)
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
  // source_url intentionally omitted — see EventDetail above.
  is_featured: boolean;
  date_is_estimated: boolean;
  is_recurring?: boolean;
  governance?: string | null;
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
    const rows = await fetchAllRows<Row>((from, to) =>
      supabaseAdmin
        .from("events")
        .select(DISCOVERY_EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(UK_BOUNDS_OR_NULL)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, to),
    );
    const all: DistanceEvent[] = [];
    for (const r of rows) {
      const match = rowMatchesDistanceKey(
        {
          distances: r.distances,
          distance_tags: r.distance_tags,
          terrain_tags: r.terrain_tags,
        },
        cfg.key,
      );
      if (!match) continue;
      all.push({
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
      });
    }

    // Discovery-surface trust gate: only include events with a link on
    // the organiser's own site (not aggregator, not third-party entry
    // platform). Event detail pages still render "Enter now" for these
    // — we just don't recommend them from landing pages. See
    // src/lib/link-trust.ts and mem://constraints/scraped-data-trust.
    const trusted = all.filter((e) =>
      hasDiscoverableLink(e.entry_url, e.organiser_url, e.governance),
    );

    // Group by region for the regional breakdown section.
    const counts = new Map<string, number>();
    for (const e of trusted) {
      if (e.region) counts.set(e.region, (counts.get(e.region) ?? 0) + 1);
    }
    const regionCounts = Array.from(counts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    const sorted = sortEstimatedLastWithinMonth(trusted);

    return {
      events: sorted.slice(0, DISPLAY_LIMIT),
      regionCounts,
      total: trusted.length,
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
    type RowWithTags = DistanceEvent & {
      _distance_tags: string[] | null;
      _terrain_tags: string[] | null;
    };
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
    const rows = await fetchAllRows<Row>((from, to) =>
      supabaseAdmin
        .from("events")
        .select(DISCOVERY_EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .eq("region", region.name)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(UK_BOUNDS_OR_NULL)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, to),
    );
    const all: RowWithTags[] = rows.map((r) => ({
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
      _distance_tags: r.distance_tags,
      _terrain_tags: r.terrain_tags,
    }));

    // Discovery-surface trust gate (same policy as getEventsByDistance).
    // Filter BEFORE computing otherDistanceCounts so the counts shown in
    // the "other distances in this region" panel match what users will
    // actually see when they click through.
    const trusted = all.filter((e) =>
      hasDiscoverableLink(e.entry_url, e.organiser_url, e.governance),
    );

    const rowMatches = (e: RowWithTags, key: DistanceKey) =>
      rowMatchesDistanceKey(
        {
          distances: e.distance_type,
          distance_tags: e._distance_tags,
          terrain_tags: e._terrain_tags,
        },
        key,
      );

    // Bucket the (trust-filtered) rows by every distance for the
    // "other distances in this region" panel.
    const otherDistanceCounts: Record<DistanceKey, number> = {
      "5k": 0,
      "10k": 0,
      "half-marathon": 0,
      marathon: 0,
      trail: 0,
      ultra: 0,
    };
    for (const e of trusted) {
      for (const p of DISTANCE_PAGE_LIST) {
        if (rowMatches(e, p.key)) otherDistanceCounts[p.key]++;
      }
    }

    const matched = sortEstimatedLastWithinMonth(
      trusted.filter((e) => rowMatches(e, cfg.key)),
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

    // Pull every active future event with a region + distances/tags in one pass.
    type MatrixRow = {
      region: string | null;
      distances: string | null;
      distance_tags: string[] | null;
      terrain_tags: string[] | null;
      entry_url: string | null;
      organiser_url: string | null;
      governance: string | null;
    };
    const raw = await fetchAllRows<MatrixRow>((from, to) =>
      supabaseAdmin
        .from("events")
        .select(
          "region, distances, distance_tags, terrain_tags, entry_url, organiser_url, governance",
        )
        .eq("status", "ACTIVE")
        .not("region", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(UK_BOUNDS_OR_NULL)
        .range(from, to),
    );
    const rows = raw.filter(
      (r): r is MatrixRow & { region: string } => !!r.region,
    );

    const counts = new Map<string, number>();
    for (const r of rows) {
      // Discovery-surface trust gate — match the landing-page filter so
      // the matrix counts agree with what users actually see.
      if (!hasDiscoverableLink(r.entry_url, r.organiser_url, r.governance)) continue;
      for (const p of DISTANCE_PAGE_LIST) {
        if (rowMatchesDistanceKey(r, p.key)) {
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

export type SameTownEvent = {
  id: string;
  slug: string;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  date_is_estimated: boolean;
  town: string | null;
  county: string | null;
};

export type SameWeekendNearbyEvent = {
  id: string;
  slug: string;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  date_is_estimated: boolean;
  town: string | null;
  county: string | null;
  /** 'county' = exact-county match; 'region' = wider region fallback fill. */
  scope: "county" | "region";
};

export type OrganiserClub = {
  slug: string;
  name: string;
};

export type OtherRaceByOrganiserEvent = {
  id: string;
  slug: string;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  date_is_estimated: boolean;
  town: string | null;
  county: string | null;
};

export type EventPageData = {
  event: EventDetail;
  related: RelatedEvents;
  /** Other upcoming events in the same town as the current event. */
  sameTown: SameTownEvent[];
  /** Events in the same county on the same weekend (within ±2 days). */
  sameWeekendNearby: SameWeekendNearbyEvent[];
  /** Matched running club for organiser line / onward journeys. */
  matchingClub: OrganiserClub | null;
  /** Other upcoming races by the matched organiser club. */
  otherRacesByOrganiser: OtherRaceByOrganiserEvent[];
  /**
   * Search-index decision for this event page. Computed server-side
   * from past/slug-suffix/orphan/duplicate-sibling rules so the
   * `head()` function (which has no DB access) can wire up the
   * `robots` meta and decide whether to ship Event JSON-LD.
   */
  indexability: import("@/lib/event-indexability").IndexabilityResult;
};

export const getEventPageData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<EventPageData> => {
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, date_raw, date_from, date_to, sort_date, town, county, region, distances, discipline, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, organiser, organiser_club_id, is_featured, date_is_estimated, governance, organiser_type, race_profile, created_at, norm_created_at, lat, lng, status, duplicate_of",
      )
      .eq("slug", data.slug)
      .in("status", ["ACTIVE", "DUPLICATE", "HIDDEN"])
      .maybeSingle();


    if (error) throw new Error(error.message);
    if (!row) {
      throw notFound();
    }

    // DUPLICATE with a survivor: permanent redirect. GSC eventually moves
    // the URL from Soft 404 into the "Page with redirect" bucket.
    if (row.status === "DUPLICATE") {
      if (row.duplicate_of) {
        const { data: survivor } = await supabaseAdmin
          .from("events")
          .select("slug")
          .eq("id", row.duplicate_of as string)
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
      // Orphan DUPLICATE (no target, or target no longer ACTIVE):
      // real 404 rather than a soft-404 rendered UI. Reversible — if
      // duplicate_of is set later, the redirect above takes over.
      throw notFound();
    }

    // HIDDEN: legacy status not currently assigned by any code path but
    // 233 rows persist in the DB. Treat as "gone right now, may revisit"
    // — real 404. If a row is ever flipped back to ACTIVE, Google
    // re-crawls and re-indexes on its own.
    if (row.status === "HIDDEN") {
      throw notFound();
    }

    // ACTIVE past events (>90d): real 404 so Google drops the URL from
    // the index instead of leaving it in the Soft 404 bucket. Row stays
    // in the DB for sync coverage. Threshold matches the GSC cohort;
    // ~209 rows roll into this window over the next month.
    if (row.sort_date) {
      const today = new Date().toISOString().slice(0, 10);
      const ninetyAgo = new Date();
      ninetyAgo.setUTCDate(ninetyAgo.getUTCDate() - 90);
      const cutoffIso = ninetyAgo.toISOString().slice(0, 10);
      if (row.sort_date < cutoffIso && row.sort_date < today) {
        throw notFound();
      }
    }
    const eventRow = row as EventDetail & {
      lat: number | null;
      lng: number | null;
      distance_tags: string[] | null;
      terrain_tags: string[] | null;
      organiser_club_id: string | null;
      status: string;
      duplicate_of: string | null;
    };
    const {
      lat: eventLat,
      lng: eventLng,
      distance_tags: eventDistanceTags,
      terrain_tags: eventTerrainTags,
      organiser_club_id: eventOrganiserClubId,
      status: _status,
      duplicate_of: _duplicate_of,
      ...eventPublic
    } = eventRow;
    void _status;
    void _duplicate_of;
    const event = eventPublic as EventDetail;


    // Prefer tag-based primary distance; fall back to legacy substring for
    // rows that haven't been backfilled yet.
    const primaryKey =
      primaryDistanceKeyFromTags(eventDistanceTags, eventTerrainTags) ??
      primaryDistanceKey(event.distances);

    const related: RelatedEvents = {
      events: [],
      totalCount: 0,
      distanceKey: primaryKey,
    };

    if (event.region) {
      const today = new Date().toISOString().slice(0, 10);
      type Row = RelatedEvent & {
        distances: string | null;
        distance_tags: string[] | null;
        terrain_tags: string[] | null;
        entry_url: string | null;
        organiser_url: string | null;
        governance: string | null;
      };
      type RawRow = {
        id: string;
        slug: string | null;
        name: string;
        date_raw: string | null;
        sort_date: string | null;
        date_is_estimated: boolean | null;
        town: string | null;
        county: string | null;
        distances: string | null;
        distance_tags: string[] | null;
        terrain_tags: string[] | null;
        entry_url: string | null;
        organiser_url: string | null;
        governance: string | null;
      };
      const rawRows = await fetchAllRows<RawRow>((from, to) =>
        supabaseAdmin
          .from("events")
          .select(
            "id, slug, name, date_raw, sort_date, date_is_estimated, town, county, distances, distance_tags, terrain_tags, entry_url, organiser_url, governance",
          )
          .eq("status", "ACTIVE")
          .eq("region", event.region!)
          .not("slug", "is", null)
          .or(`sort_date.gte.${today},sort_date.is.null`)
          .or(UK_BOUNDS_OR_NULL)
          .order("sort_date", { ascending: true, nullsFirst: false })
          .range(from, to),
      );
      const all: Row[] = rawRows
        .filter((r): r is RawRow & { slug: string } => !!r.slug)
        .map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          date_raw: r.date_raw,
          sort_date: r.sort_date,
          date_is_estimated: !!r.date_is_estimated,
          town: r.town,
          county: r.county,
          distances: r.distances,
          distance_tags: r.distance_tags,
          terrain_tags: r.terrain_tags,
          entry_url: r.entry_url,
          organiser_url: r.organiser_url,
          governance: r.governance,
        }));

      // Discovery-surface trust gate — "other races near you" should
      // only recommend events with an organiser-owned link. The current
      // event itself is exempt (it's not being recommended). See
      // mem://constraints/scraped-data-trust.
      const trusted = all.filter(
        (r) =>
          r.id === event.id ||
          hasDiscoverableLink(r.entry_url, r.organiser_url, r.governance),
      );

      const matched = related.distanceKey
        ? trusted.filter((r) => rowMatchesDistanceKey(r, related.distanceKey!))
        : trusted;

      // Count includes the event itself (drives the "one of N" prose and the
      // "View all N" footer link — both region+distance scoped).
      related.totalCount = matched.length;
      related.events = matched
        .filter((r) => r.id !== event.id)
        .slice(0, 6)
        .map(({ distances: _d, distance_tags: _dt, terrain_tags: _tt, entry_url: _eu, organiser_url: _ou, governance: _g, ...rest }) => {
          void _d;
          void _dt;
          void _tt;
          void _eu;
          void _ou;
          void _g;
          return rest;
        });
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
          entry_url: string | null;
          organiser_url: string | null;
          date_is_estimated: boolean | null;
          distance_miles: number | null;
          governance: string | null;
        }>) {
          if (!r.slug || r.id === event.id) continue;
          // The RPC predates tag arrays; keep the legacy substring filter
          // here. Could be upgraded if/when the RPC starts returning tags.
          if (cfg && !matchesDistance(r.distance_type, cfg)) continue;
          // Discovery-surface trust gate (same as the region fallback).
          if (!hasDiscoverableLink(r.entry_url, r.organiser_url, r.governance)) continue;
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

    // ----- Same-town block -----
    // Up to 6 other upcoming ACTIVE events whose town matches the current
    // event's town (case-insensitive). Pure internal linking — the page
    // only renders the block when there are >=3 siblings.
    const sameTown: SameTownEvent[] = [];
    const eventTown = event.town?.trim();
    if (eventTown) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: townRows, error: townErr } = await supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, date_is_estimated, town, county, entry_url, organiser_url, governance",
        )
        .eq("status", "ACTIVE")
        .ilike("town", eventTown)
        .neq("id", event.id)
        .not("slug", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .limit(50);
      if (!townErr && townRows) {
        for (const r of townRows) {
          // Discovery-surface trust gate — same-town suggestions only
          // recommend events with a discoverable link.
          if (
            !hasDiscoverableLink(
              r.entry_url as string | null,
              r.organiser_url as string | null,
              r.governance as string | null,
            )
          )
            continue;
          sameTown.push({
            id: r.id as string,
            slug: r.slug as string,
            name: r.name as string,
            date_raw: r.date_raw as string | null,
            sort_date: r.sort_date as string | null,
            date_is_estimated: !!r.date_is_estimated,
            town: r.town as string | null,
            county: r.county as string | null,
          });
          if (sameTown.length >= 6) break;
        }
      }
    }

    // ----- Organiser Club Match -----
    // Prefer the FK populated by the deterministic backfill
    // (src/lib/backfill-organiser-match.server.ts). Fall back to
    // the legacy name-based lookup for rows the backfill hasn't
    // reached — cheap safety net until every row is matched.
    let matchingClub: OrganiserClub | null = null;
    if (eventOrganiserClubId) {
      const { data: clubRow } = await supabaseAdmin
        .from("public_clubs")
        .select("slug, name")
        .eq("id", eventOrganiserClubId)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (clubRow?.slug && clubRow?.name) {
        matchingClub = { slug: clubRow.slug, name: clubRow.name };
      }
    }
    const orgTrim = event.organiser?.trim();
    if (!matchingClub && orgTrim && orgTrim.toLowerCase() !== "tbc") {
      const orgLower = orgTrim.toLowerCase();
      const normSlug = orgLower
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { data: clubRows } = await supabaseAdmin
        .from("public_clubs")
        .select("slug, name")
        .eq("status", "ACTIVE")
        .limit(100);
      if (clubRows) {
        for (const c of clubRows) {
          if (!c.slug || !c.name) continue;
          const cName = c.name.trim().toLowerCase();
          const cSlug = c.slug.trim().toLowerCase();
          if (cName === orgLower || cSlug === normSlug) {
            matchingClub = { slug: c.slug, name: c.name };
            break;
          }
        }
      }
    }


    // ----- Same weekend nearby -----
    // County-first, region fallback fill up to 6. Rows without county AND
    // region (TRA, some parkrun) still can't render — that's fine.
    const sameWeekendNearby: SameWeekendNearbyEvent[] = [];
    if (event.sort_date && (event.county || event.region)) {
      const [y, m, d] = event.sort_date.split("-").map(Number);
      const baseUTC = Date.UTC(y, m - 1, d);
      const minDate = new Date(baseUTC - 2 * 86400000).toISOString().slice(0, 10);
      const maxDate = new Date(baseUTC + 2 * 86400000).toISOString().slice(0, 10);

      const seen = new Set<string>();
      const collect = async (scope: "county" | "region") => {
        const column = scope === "county" ? "county" : "region";
        const value = scope === "county" ? event.county : event.region;
        if (!value) return;
        const { data: wkRows } = await supabaseAdmin
          .from("events")
          .select(
            "id, slug, name, date_raw, sort_date, date_is_estimated, town, county, entry_url, organiser_url, governance",
          )
          .eq("status", "ACTIVE")
          .eq(column, value)
          .neq("id", event.id)
          .not("slug", "is", null)
          .gte("sort_date", minDate)
          .lte("sort_date", maxDate)
          .order("sort_date", { ascending: true, nullsFirst: false })
          .limit(30);

        if (!wkRows) return;
        for (const r of wkRows) {
          const slug = r.slug as string;
          if (seen.has(slug)) continue;
          if (
            !hasDiscoverableLink(
              r.entry_url as string | null,
              r.organiser_url as string | null,
              r.governance as string | null,
            )
          )
            continue;
          sameWeekendNearby.push({
            id: r.id as string,
            slug,
            name: r.name as string,
            date_raw: r.date_raw as string | null,
            sort_date: r.sort_date as string | null,
            date_is_estimated: !!r.date_is_estimated,
            town: r.town as string | null,
            county: r.county as string | null,
            scope,
          });
          seen.add(slug);
          if (sameWeekendNearby.length >= 6) break;
        }
      };

      if (event.county) await collect("county");
      if (sameWeekendNearby.length < 3 && event.region) {
        await collect("region");
      }
    }

    // ----- Other races by {organiser} -----
    // Prefer the FK when we have one — it's canonical and survives
    // organiser-text drift across the club's events. Fall back to the
    // legacy case-insensitive name match for pre-backfill rows.
    const otherRacesByOrganiser: OtherRaceByOrganiserEvent[] = [];
    if (matchingClub) {
      const today = new Date().toISOString().slice(0, 10);
      let q = supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, date_is_estimated, town, county, organiser",
        )
        .eq("status", "ACTIVE")
        .neq("id", event.id)
        .not("slug", "is", null)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .limit(20);

      q = eventOrganiserClubId
        ? q.eq("organiser_club_id", eventOrganiserClubId)
        : q.ilike("organiser", orgTrim!);

      const { data: orgRows } = await q;

      if (orgRows) {
        for (const r of orgRows) {
          otherRacesByOrganiser.push({
            id: r.id as string,
            slug: r.slug as string,
            name: r.name as string,
            date_raw: r.date_raw as string | null,
            sort_date: r.sort_date as string | null,
            date_is_estimated: !!r.date_is_estimated,
            town: r.town as string | null,
            county: r.county as string | null,
          });
          if (otherRacesByOrganiser.length >= 6) break;
        }
      }
    }


    // ----- Indexability decision -----
    // Find sibling instances by TWO signals, unioned by id:
    //  (a) Normalised name match — catches "Trunce Series Race N",
    //      "Tatton Park 5K & 10K — {month}", "{venue} Grand Prix Race N".
    //  (b) Slug stem match (everything before the last segment) —
    //      catches city-suffix series the name keeps unique:
    //      `pretty-muddy-{city}`, `race-for-life-{city}`,
    //      `holme-pierrepont-grand-prix-race-N`.
    // Earliest upcoming instance in the union stays indexable; the
    // rest get noindex. See computeIndexability for the rule.
    const todayIso = new Date().toISOString().slice(0, 10);
    const sibMap = new Map<string, { id: string; sort_date: string | null }>();
    const currentNorm = normaliseEventName(event.name);
    const tokens = currentNorm.split(" ").filter(Boolean);
    if (tokens.length > 0) {
      const prefix = tokens.slice(0, Math.min(2, tokens.length)).join(" ");
      const { data: nameRows } = await supabaseAdmin
        .from("events")
        .select("id, name, sort_date")
        .eq("status", "ACTIVE")
        .ilike("name", `${prefix}%`)
        .limit(200);
      for (const r of nameRows ?? []) {
        if (normaliseEventName((r.name as string) ?? "") !== currentNorm) continue;
        sibMap.set(r.id as string, {
          id: r.id as string,
          sort_date: r.sort_date as string | null,
        });
      }
    }
    const stem = slugStem(event.slug);
    if (stem) {
      const { data: stemRows } = await supabaseAdmin
        .from("events")
        .select("id, sort_date")
        .eq("status", "ACTIVE")
        .ilike("slug", `${stem}-%`)
        .limit(200);
      for (const r of stemRows ?? []) {
        sibMap.set(r.id as string, {
          id: r.id as string,
          sort_date: r.sort_date as string | null,
        });
      }
    }
    // Always include the current event so single-occurrence events
    // don't accidentally trigger the ≥2 check via an empty map.
    sibMap.set(event.id, { id: event.id, sort_date: event.sort_date });
    const indexability: IndexabilityResult = computeIndexability(
      event,
      Array.from(sibMap.values()),
      todayIso,
    );

    return {
      event,
      related,
      sameTown,
      sameWeekendNearby,
      matchingClub,
      otherRacesByOrganiser,
      indexability,
    };
  });

// ----- Taxonomy landing pages (governance / organiser_type) -----

const taxonomySchema = z.object({
  field: z.enum(["governance", "organiser_type"]),
  value: z.string().trim().min(1).max(64).regex(/^[a-z_]+$/),
});

export const getEventsByTaxonomy = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => taxonomySchema.parse(input))
  .handler(async ({ data }): Promise<{
    events: DistanceEvent[];
    regionCounts: { region: string; count: number }[];
    total: number;
  }> => {
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
      entry_fee: string | null;
      entry_url: string | null;
      organiser_url: string | null;
      is_featured: boolean | null;
      date_is_estimated: boolean | null;
      is_recurring: boolean | null;
    };
    const rows = await fetchAllRows<Row>((from, to) =>
      supabaseAdmin
        .from("events")
        .select(DISCOVERY_EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .eq(data.field, data.value as never)
        .or(`sort_date.gte.${today},sort_date.is.null`)
        .or(UK_BOUNDS_OR_NULL)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from, to),
    );

    const all: DistanceEvent[] = rows.map((r) => ({
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

    // Governance-permitted races are inherently trusted (permit implies a
    // real, sanctioned event), so we admit entry-platform-only links too.
    // Non-governance surfaces (e.g. organiser_type=club) still require an
    // organiser-owned link.
    const trusted =
      data.field === "governance"
        ? all
        : all.filter((e) => hasOrganiserOwnedLink(e.entry_url, e.organiser_url));

    const counts = new Map<string, number>();
    for (const e of trusted) {
      if (e.region) counts.set(e.region, (counts.get(e.region) ?? 0) + 1);
    }
    const regionCounts = Array.from(counts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    const sorted = sortEstimatedLastWithinMonth(trusted);

    return {
      events: sorted.slice(0, DISPLAY_LIMIT),
      regionCounts,
      total: trusted.length,
    };
  });



