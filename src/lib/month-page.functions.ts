import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { sortEstimatedLastWithinMonth } from "@/lib/month-filter";
import {
  DISTANCE_PAGES,
  matchesDistance,
  type DistanceKey,
} from "@/lib/distance-filters";
import { eventMatchesDistanceKey } from "@/lib/event-tags";
import type { DistanceEvent } from "@/lib/events.functions";

export type MonthPageData = {
  events: DistanceEvent[];
  total: number;
  /** "YYYY-MM" */
  monthKey: string;
};

const monthKeyRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const inputSchema = z.object({
  monthKey: z.string().regex(monthKeyRe),
  distanceKey: z
    .enum(["5k", "10k", "half-marathon", "marathon", "trail", "ultra"])
    .optional(),
});

function monthBounds(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const fromDt = new Date(Date.UTC(y, m - 1, 1));
  const toDt = new Date(Date.UTC(y, m, 0)); // last day of month
  return {
    from: fromDt.toISOString().slice(0, 10),
    to: toDt.toISOString().slice(0, 10),
  };
}

function rowMatches(
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

export const getEventsForMonth = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<MonthPageData> => {
    const { from, to } = monthBounds(data.monthKey);

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

    const all: Row[] = [];
    const pageSize = 1000;
    for (let from0 = 0; ; from0 += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(DISCOVERY_EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .gte("sort_date", from)
        .lte("sort_date", to)
        .or(UK_BOUNDS_OR_NULL)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .range(from0, from0 + pageSize - 1);
      if (error) throw new Error(error.message);
      const r = (rows ?? []) as Row[];
      all.push(...r);
      if (r.length < pageSize) break;
    }

    const trusted = all.filter((e) =>
      hasOrganiserOwnedLink(e.entry_url, e.organiser_url),
    );

    const filtered = data.distanceKey
      ? trusted.filter((r) =>
          rowMatches(
            {
              distances: r.distances,
              distance_tags: r.distance_tags,
              terrain_tags: r.terrain_tags,
            },
            data.distanceKey as DistanceKey,
          ),
        )
      : trusted;

    const events: DistanceEvent[] = filtered.map((r) => ({
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

    const sorted = sortEstimatedLastWithinMonth(events);
    return { events: sorted, total: sorted.length, monthKey: data.monthKey };
  });

/**
 * Lightweight per-month per-distance counts for the next 12 months.
 * Used by the sitemap to include only month pages with ≥3 events.
 * Fetches every active event in the rolling 12-month window once,
 * then buckets in JS — one DB pass total.
 */
export type MonthMatrixRow = {
  monthKey: string;
  distanceKey: DistanceKey | "all";
  total: number;
};

export const getMonthPageMatrix = createServerFn({ method: "GET" })
  .handler(async (): Promise<MonthMatrixRow[]> => {
    const now = new Date();
    const startKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const startFrom = `${startKey}-01`;
    // 12 months window
    const endY = now.getUTCMonth() + 12 >= 12 ? now.getUTCFullYear() + Math.floor((now.getUTCMonth() + 12) / 12) : now.getUTCFullYear();
    const endM0 = (now.getUTCMonth() + 12) % 12;
    const endLastDay = new Date(Date.UTC(endY, endM0 + 1, 0)).toISOString().slice(0, 10);

    type Row = {
      sort_date: string | null;
      distances: string | null;
      distance_tags: string[] | null;
      terrain_tags: string[] | null;
      entry_url: string | null;
      organiser_url: string | null;
    };

    const all: Row[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select(
          "sort_date, distances, distance_tags, terrain_tags, entry_url, organiser_url",
        )
        .eq("status", "ACTIVE")
        .gte("sort_date", startFrom)
        .lte("sort_date", endLastDay)
        .or(UK_BOUNDS_OR_NULL)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const r = (data ?? []) as Row[];
      all.push(...r);
      if (r.length < pageSize) break;
    }

    const trusted = all.filter((e) =>
      hasOrganiserOwnedLink(e.entry_url, e.organiser_url),
    );

    const counts = new Map<string, number>();
    const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
    const distanceKeys: DistanceKey[] = ["5k", "10k", "half-marathon", "marathon", "trail", "ultra"];

    for (const r of trusted) {
      if (!r.sort_date || r.sort_date.length < 7) continue;
      const monthKey = r.sort_date.slice(0, 7);
      bump(`${monthKey}|all`);
      for (const k of distanceKeys) {
        if (
          rowMatches(
            {
              distances: r.distances,
              distance_tags: r.distance_tags,
              terrain_tags: r.terrain_tags,
            },
            k,
          )
        ) {
          bump(`${monthKey}|${k}`);
        }
      }
    }

    const out: MonthMatrixRow[] = [];
    for (const [k, total] of counts.entries()) {
      const [monthKey, d] = k.split("|");
      out.push({ monthKey, distanceKey: d as DistanceKey | "all", total });
    }
    return out;
  });
