-- Keep the public radius helper as SECURITY INVOKER by sourcing it from the
-- sanctioned safe view instead of the base events table.
CREATE OR REPLACE FUNCTION public.events_within_radius(p_lat double precision, p_lng double precision, p_radius_miles double precision, p_max_results integer DEFAULT 500)
 RETURNS TABLE(id uuid, name text, slug text, date_raw text, town text, county text, distance_type text, entry_fee text, entry_url text, organiser_url text, is_featured boolean, date_is_estimated boolean, distance_miles double precision, governance text, organiser_type text, race_profile text)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
    where e.lat is not null
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

-- Full-text search reads the base table's tsvector, so it stays invoker-only
-- and is reachable from trusted server code only.
ALTER FUNCTION public.search_events_v1(text, integer) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.search_events_v1(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_events_v1(text, integer) FROM authenticated;