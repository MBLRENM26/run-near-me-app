
CREATE OR REPLACE FUNCTION public.search_clubs_v1(q text, lim integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  town text,
  county text,
  region text,
  governing_body text,
  is_claimed boolean
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.id, c.slug, c.name, c.town, c.county, c.region, c.governing_body, c.is_claimed
  FROM public.clubs c,
       websearch_to_tsquery('english', q) AS qq
  WHERE c.status = 'ACTIVE'
    AND c.tsv @@ qq
  ORDER BY ts_rank(c.tsv, qq) DESC,
           c.is_claimed DESC,
           c.name ASC
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

GRANT EXECUTE ON FUNCTION public.search_clubs_v1(text, integer) TO anon, authenticated, service_role;
