import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { hasDiscoverableLink } from "@/lib/link-trust";
import {
  EXPLORER_DATE_MODES,
  EXPLORER_DISTANCE_VALUES,
  EXPLORER_GOVERNANCE_VALUES,
  EXPLORER_PROFILE_VALUES,
  EXPLORER_SORT_VALUES,
  EXPLORER_TERRAIN_VALUES,
  distanceMiles,
  hasCoordinates,
  matchesExplorerRadius,
  type ExplorerEvent,
  type ExplorerResult,
} from "@/lib/explorer";

const MAX_RESULTS = 100;
const FETCH_LIMIT = 501;

const inputSchema = z
  .object({
    q: z.string().trim().max(80).default(""),
    lat: z.number().min(49.5).max(61.2).optional(),
    lng: z.number().min(-9).max(2.5).optional(),
    label: z.string().trim().max(80).optional(),
    radius: z.union([z.literal(10), z.literal(25), z.literal(50)]).default(25),
    distance: z.enum(EXPLORER_DISTANCE_VALUES).default("all"),
    terrain: z.enum(EXPLORER_TERRAIN_VALUES).default("all"),
    governance: z.enum(EXPLORER_GOVERNANCE_VALUES).default("all"),
    profile: z.enum(EXPLORER_PROFILE_VALUES).default("all"),
    dateMode: z.enum(EXPLORER_DATE_MODES).default("dated"),
    sort: z.enum(EXPLORER_SORT_VALUES).default("date"),
  })
  .refine((value) => (value.lat == null) === (value.lng == null), {
    message: "Latitude and longitude must be supplied together",
  });

type PublicEventRow = {
  id: string | null;
  slug: string | null;
  name: string | null;
  date_raw: string | null;
  sort_date: string | null;
  date_from: string | null;
  date_to: string | null;
  date_is_estimated: boolean | null;
  is_recurring: boolean | null;
  town: string | null;
  county: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  distances: string | null;
  distance_tags: string[] | null;
  terrain_tags: string[] | null;
  governance: string | null;
  organiser_type: string | null;
  race_profile: string | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
};

const EXPLORER_COLUMNS = [
  "id",
  "slug",
  "name",
  "date_raw",
  "sort_date",
  "date_from",
  "date_to",
  "date_is_estimated",
  "is_recurring",
  "town",
  "county",
  "region",
  "lat",
  "lng",
  "distances",
  "distance_tags",
  "terrain_tags",
  "governance",
  "organiser_type",
  "race_profile",
  "entry_fee",
  "entry_url",
  "organiser_url",
].join(", ");

function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const latitudeDelta = radiusMiles / 69;
  const cosine = Math.max(Math.cos((lat * Math.PI) / 180), 0.0001);
  const longitudeDelta = radiusMiles / (69 * cosine);
  return {
    minLat: lat - latitudeDelta,
    maxLat: lat + latitudeDelta,
    minLng: lng - longitudeDelta,
    maxLng: lng + longitudeDelta,
  };
}

function toExplorerEvent(
  row: PublicEventRow,
  origin?: { lat: number; lng: number },
): ExplorerEvent | null {
  if (!row.id || !row.slug || !row.name) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    dateRaw: row.date_raw,
    sortDate: row.sort_date,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    dateIsEstimated: !!row.date_is_estimated,
    isRecurring: !!row.is_recurring,
    town: row.town,
    county: row.county,
    region: row.region,
    distances: row.distances,
    distanceTags: row.distance_tags ?? [],
    terrainTags: row.terrain_tags ?? [],
    governance: row.governance,
    organiserType: row.organiser_type,
    raceProfile: row.race_profile,
    entryFee: row.entry_fee,
    distanceMiles:
      origin && row.lat != null && row.lng != null
        ? distanceMiles(origin.lat, origin.lng, row.lat, row.lng)
        : null,
  };
}

function compareEvents(a: ExplorerEvent, b: ExplorerEvent, sort: "date" | "distance") {
  if (sort === "distance") {
    const distanceOrder =
      (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY);
    if (distanceOrder !== 0) return distanceOrder;
  }
  const aDate = a.sortDate ?? "9999-12-31";
  const bDate = b.sortDate ?? "9999-12-31";
  const dateOrder = aDate.localeCompare(bDate);
  return dateOrder || a.name.localeCompare(b.name);
}

/**
 * Read-only Explorer query over the approved public projection. It deliberately
 * reuses the existing full-text search RPC and applies the same destination
 * trust gate as the current discovery pages. No provenance/admin columns are
 * selected and no data is written.
 */
export const getExplorerEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ExplorerResult> => {
    let searchIds: string[] | null = null;
    let searchCapped = false;
    if (data.q) {
      const { data: matches, error: searchError } = await supabase.rpc("search_events_v1", {
        q: data.q,
        lim: 50,
      });
      if (searchError) throw new Error(searchError.message);
      searchIds = (matches ?? []).map((row) => row.id);
      searchCapped = searchIds.length >= 50;
      if (!searchIds.length) return { events: [], total: 0, capped: false };
    }

    let query = supabase.from("events_public_v1").select(EXPLORER_COLUMNS).limit(FETCH_LIMIT);

    if (searchIds) query = query.in("id", searchIds);

    if (data.dateMode === "dated") {
      query = query
        .gte("sort_date", new Date().toISOString().slice(0, 10))
        .order("sort_date", { ascending: true, nullsFirst: false });
    } else {
      query = query.is("sort_date", null).eq("is_recurring", true);
    }

    if (data.distance !== "all") {
      query = query.contains("distance_tags", [data.distance]);
    }
    if (data.terrain !== "all") {
      query = query.contains("terrain_tags", [data.terrain]);
    }
    if (data.governance !== "all") {
      query = query.eq("governance", data.governance);
    }
    if (data.profile !== "all") {
      query = query.eq("race_profile", data.profile);
    }

    if (hasCoordinates(data)) {
      const box = boundingBox(data.lat, data.lng, data.radius);
      query = query
        .gte("lat", box.minLat)
        .lte("lat", box.maxLat)
        .gte("lng", box.minLng)
        .lte("lng", box.maxLng);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const publicRows = (rows ?? []) as unknown as PublicEventRow[];
    const eligible = publicRows
      .filter((row) => hasDiscoverableLink(row.entry_url, row.organiser_url, row.governance))
      .filter((row) => matchesExplorerRadius(data, row.lat ?? null, row.lng ?? null));

    const origin = hasCoordinates(data) ? { lat: data.lat, lng: data.lng } : undefined;
    const mapped = eligible
      .map((row) => toExplorerEvent(row, origin))
      .filter((event): event is ExplorerEvent => event != null)
      .sort((a, b) => compareEvents(a, b, data.sort));

    return {
      events: mapped.slice(0, MAX_RESULTS),
      total: mapped.length,
      capped: searchCapped || publicRows.length >= FETCH_LIMIT || mapped.length > MAX_RESULTS,
    };
  });
