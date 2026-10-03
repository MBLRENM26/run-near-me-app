import { UK_BOUNDS, UK_COUNTRIES } from "./event-geography";

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
  "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, is_featured, date_is_estimated, is_recurring, governance, organiser_type, race_profile";

/**
 * UK discovery only: an explicit overseas country fails even with null
 * coordinates or a mistaken UK point. Missing-country and un-geocoded UK
 * records retain their previous eligibility. This is not the detail-page,
 * lifecycle, indexability or public-view contract.
 *
 * Use as: `.or(UK_BOUNDS_OR_NULL)` after `.eq("status", "ACTIVE")`.
 */
export const UK_BOUNDS_OR_NULL = `and(or(country.is.null,country.eq.,${UK_COUNTRIES.map((c) => `country.ilike.${c}`).join(",")}),or(lat.is.null,and(lat.gte.${UK_BOUNDS.south},lat.lte.${UK_BOUNDS.north},lng.gte.${UK_BOUNDS.west},lng.lte.${UK_BOUNDS.east})))`;
