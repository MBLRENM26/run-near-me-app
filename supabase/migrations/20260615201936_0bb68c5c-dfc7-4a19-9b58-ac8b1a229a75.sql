
CREATE OR REPLACE FUNCTION public.search_events_v1(q text, lim int DEFAULT 20)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  town text,
  county text,
  sort_date date,
  distances text,
  is_featured boolean,
  date_is_estimated boolean,
  is_past boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT e.id, e.slug, e.name, e.town, e.county, e.sort_date,
         e.distances, e.is_featured, e.date_is_estimated,
         (e.sort_date IS NOT NULL AND e.sort_date < CURRENT_DATE) AS is_past
  FROM public.events e,
       websearch_to_tsquery('english', q) AS qq
  WHERE e.status = 'ACTIVE'
    AND e.duplicate_of IS NULL
    AND e.tsv @@ qq
    AND (e.sort_date IS NULL OR e.sort_date >= CURRENT_DATE - 14)
  ORDER BY ts_rank(e.tsv, qq) DESC,
           e.is_featured DESC,
           e.sort_date ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

GRANT EXECUTE ON FUNCTION public.search_events_v1(text, int) TO anon, authenticated, service_role;
