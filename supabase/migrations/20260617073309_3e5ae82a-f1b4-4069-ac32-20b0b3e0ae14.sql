CREATE OR REPLACE FUNCTION public.search_events_v1(q text, lim integer DEFAULT 20)
 RETURNS TABLE(id uuid, slug text, name text, town text, county text, sort_date date, distances text, is_featured boolean, date_is_estimated boolean, is_past boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.slug, e.name, e.town, e.county, e.sort_date,
         e.distances, e.is_featured, e.date_is_estimated,
         false AS is_past
  FROM public.events e,
       websearch_to_tsquery('english', q) AS qq
  WHERE e.status = 'ACTIVE'
    AND e.duplicate_of IS NULL
    AND e.tsv @@ qq
    AND (e.sort_date IS NULL OR e.sort_date >= CURRENT_DATE)
  ORDER BY ts_rank(e.tsv, qq) DESC,
           e.is_featured DESC,
           e.sort_date ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 50));
$function$;