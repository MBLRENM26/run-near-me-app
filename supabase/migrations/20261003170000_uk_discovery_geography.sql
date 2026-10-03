-- Geography-only filtering; existing signatures, public projections, security and grants retained.
-- Keep country aliases and envelope aligned with src/lib/events-query.ts.
CREATE OR REPLACE FUNCTION public.events_within_radius(p_lat double precision, p_lng double precision, p_radius_miles double precision, p_max_results integer DEFAULT 500)
 RETURNS TABLE(id uuid, name text, slug text, date_raw text, town text, county text, distance_type text, entry_fee text, entry_url text, organiser_url text, is_featured boolean, date_is_estimated boolean, distance_miles double precision, governance text, organiser_type text, race_profile text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$;
  select q.id, q.name, q.slug, q.date_raw, q.town, q.county,
         q.distance_type, q.entry_fee,
         q.entry_url, q.organiser_url,
         q.is_featured, q.date_is_estimated, q.distance_miles,
         q.governance, q.organiser_type, q.race_profile
  from (
    select e.id, e.name, e.slug, e.date_raw, e.town, e.county,
           e.distances as distance_type,
           e.entry_fee,
           e.entry_url,
           e.organiser_url,
           e.is_featured,
           e.date_is_estimated,
           e.governance::text as governance,
           e.organiser_type::text as organiser_type,
           e.race_profile::text as race_profile,
           (2 * 3958.7613 * asin(sqrt(
             power(sin(radians(e.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(e.lat))
               * power(sin(radians(e.lng - p_lng) / 2), 2)
           ))) as distance_miles
    from public.events_public_v1 e
    where lower(coalesce(e.country, '')) IN ('','england','scotland','wales','northern ireland','united kingdom','uk','gb','gbr','great britain')
      AND (e.lat IS NULL OR (e.lat BETWEEN 49.9 AND 60.9 AND e.lng BETWEEN -8.6 AND 1.8))
      and e.lat is not null
      and e.lng is not null
      and (e.sort_date is null or e.sort_date >= CURRENT_DATE)
      and e.lat between p_lat - (p_radius_miles / 69.0)
                    and p_lat + (p_radius_miles / 69.0)
      and e.lng between p_lng - (p_radius_miles / (69.0 * greatest(cos(radians(p_lat)), 0.0001)))
                    and p_lng + (p_radius_miles / (69.0 * greatest(cos(radians(p_lat)), 0.0001)))
  ) q
  where q.distance_miles <= p_radius_miles
  order by q.distance_miles asc
  limit least(greatest(p_max_results, 1), 500);
$function$;

CREATE OR REPLACE FUNCTION public.search_events_v1(q text, lim integer DEFAULT 20)
 RETURNS TABLE(id uuid, slug text, name text, town text, county text, sort_date date, distances text, is_featured boolean, date_is_estimated boolean, is_past boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$;
  SELECT e.id, e.slug, e.name, e.town, e.county, e.sort_date,
         e.distances, e.is_featured, e.date_is_estimated,
         false AS is_past
  FROM public.events e,
       websearch_to_tsquery('english', q) AS qq
  WHERE lower(coalesce(e.country, '')) IN ('','england','scotland','wales','northern ireland','united kingdom','uk','gb','gbr','great britain')
      AND (e.lat IS NULL OR (e.lat BETWEEN 49.9 AND 60.9 AND e.lng BETWEEN -8.6 AND 1.8))
    AND e.status = 'ACTIVE'
    AND e.duplicate_of IS NULL
    AND e.tsv @@ qq
    AND (e.sort_date IS NULL OR e.sort_date >= CURRENT_DATE)
  ORDER BY ts_rank(e.tsv, qq) DESC,
           e.is_featured DESC,
           e.sort_date ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 50));
$function$;
