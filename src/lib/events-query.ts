/**
 * Shared query fragments for the events table.
 *
 * Keeping these as named constants prevents the four-way drift we hit
 * previously (the discovery select list had diverged into four variants
 * across server functions and client routes, and a single typo in the UK
 * bounding-box filter required hunting through 4 callsites).
 */

/**
 * Canonical column list for discovery surfaces (homepage, region pages,
 * distance landing, region×distance, "other races near you").
 *
 * Returns the raw DB column `distances`. Client routes that feed rows
 * straight into EventCard should map `distance_type: r.distances` after
 * fetch — see toEventCardData() below.
 *
 * CRITICAL: never add `source` or `source_url` here. Those columns are for
 * provenance/admin only — leaking them into public SSR hydration JSON puts
 * the original aggregator domain in front of scrapers and Google's cache.
 * See mem://constraints/no-source-attribution.
 */
export const DISCOVERY_EVENT_COLUMNS =
  "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, is_featured, date_is_estimated, is_recurring";

/**
 * PostgREST `.or(...)` fragment that keeps rows either inside the UK
 * mainland bounding box or with a null lat/lng (un-geocoded events stay
 * visible — they're geocoded later by the sync pipeline).
 *
 * Use as: `.or(UK_BOUNDS_OR_NULL)` after `.eq("status", "ACTIVE")`.
 */
export const UK_BOUNDS_OR_NULL =
  "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)";
