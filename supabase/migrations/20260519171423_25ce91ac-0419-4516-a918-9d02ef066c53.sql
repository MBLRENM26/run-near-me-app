
-- 1. Helper: build a URL-safe slug from arbitrary text
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;

-- 2. Backfill NULL or empty slugs from name + town + year
UPDATE public.events
SET slug = nullif(
  concat_ws('-',
    nullif(public.slugify(name), ''),
    nullif(public.slugify(town), ''),
    nullif(extract(year from sort_date)::text, '')
  ), '')
WHERE slug IS NULL OR trim(slug) = '';

-- 3. Fallback for any remaining nulls (no name/town) — use id suffix
UPDATE public.events
SET slug = 'event-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR trim(slug) = '';

-- 4. De-duplicate by appending -2, -3, ... using row_number per slug
WITH ranked AS (
  SELECT id, slug,
         row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM public.events
)
UPDATE public.events e
SET slug = ranked.slug || '-' || ranked.rn
FROM ranked
WHERE e.id = ranked.id
  AND ranked.rn > 1;

-- 5. Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique_idx ON public.events (slug);

-- 6. Extend events_within_radius RPC to return slug
DROP FUNCTION IF EXISTS public.events_within_radius(double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION public.events_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_max_results integer DEFAULT 500
)
RETURNS TABLE(
  id uuid, name text, slug text, date_raw text, town text, county text,
  distance_type text, entry_fee text,
  entry_url text, organiser_url text, source_url text,
  is_featured boolean, distance_miles double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  select q.id, q.name, q.slug, q.date_raw, q.town, q.county,
         q.distance_type, q.entry_fee,
         q.entry_url, q.organiser_url, q.source_url,
         q.is_featured, q.distance_miles
  from (
    select e.id, e.name, e.slug, e.date_raw, e.town, e.county,
           e.distances     as distance_type,
           e.entry_fee,
           e.entry_url,
           e.organiser_url,
           e.source_url,
           e.is_featured,
           (2 * 3958.7613 * asin(sqrt(
             power(sin(radians(e.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(e.lat))
               * power(sin(radians(e.lng - p_lng) / 2), 2)
           ))) as distance_miles
    from public.events e
    where e.lat is not null
      and e.lng is not null
      and e.status = 'ACTIVE'
      and (e.sort_date is null or e.sort_date >= CURRENT_DATE)
      and e.lat between p_lat - (p_radius_miles / 69.0)
                    and p_lat + (p_radius_miles / 69.0)
      and e.lng between p_lng - (p_radius_miles / (69.0 * cos(radians(p_lat))))
                    and p_lng + (p_radius_miles / (69.0 * cos(radians(p_lat))))
  ) q
  where q.distance_miles <= p_radius_miles
  order by q.distance_miles asc
  limit p_max_results;
$$;
