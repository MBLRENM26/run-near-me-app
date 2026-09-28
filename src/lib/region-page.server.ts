import type { EventCardData } from "@/components/events/EventCard";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { hasDiscoverableLink } from "@/lib/link-trust";
import { sortEstimatedLastWithinMonth } from "@/lib/month-filter";
import { slugToRegion } from "@/lib/regions";

export async function loadRegionEvents(regionSlug: string): Promise<EventCardData[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const region = slugToRegion(regionSlug);
  if (!region) throw new Error("Unknown region");
  const today = new Date().toISOString().slice(0, 10);
  const pageSize = 1000;
  const all: (EventCardData & { governance: string | null })[] = [];
  for (let from = 0; ; from += pageSize) {
    // Preserve the accepted public projection and discovery eligibility.
    // A unique tie-breaker keeps equal-date races stable across pages.
    const { data: rows, error } = await supabaseAdmin
      .from("events_public_v1")
      .select(DISCOVERY_EVENT_COLUMNS)
      .eq("region", region.name)
      .or(`sort_date.gte.${today},sort_date.is.null`)
      .or(UK_BOUNDS_OR_NULL)
      .order("sort_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error("Could not load regional events");
    const page = rows ?? [];
    all.push(
      ...(page.map((row) => ({ ...row, distance_type: row.distances })) as (EventCardData & {
        governance: string | null;
      })[]),
    );
    if (page.length < pageSize) break;
  }
  return sortEstimatedLastWithinMonth(
    all.filter((event) =>
      hasDiscoverableLink(event.entry_url, event.organiser_url, event.governance, event),
    ),
  );
}
