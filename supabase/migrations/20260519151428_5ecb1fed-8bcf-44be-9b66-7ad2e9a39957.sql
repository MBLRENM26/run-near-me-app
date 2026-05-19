
-- Idempotent rename of existing columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='latitude') THEN
    ALTER TABLE public.events RENAME COLUMN latitude TO lat;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='longitude') THEN
    ALTER TABLE public.events RENAME COLUMN longitude TO lng;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='url') THEN
    ALTER TABLE public.events RENAME COLUMN url TO entry_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='distance_type') THEN
    ALTER TABLE public.events RENAME COLUMN distance_type TO distances;
  END IF;
END $$;

-- Add new columns (idempotent)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS norm_id text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS date_from date,
  ADD COLUMN IF NOT EXISTS date_to date,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS location_raw text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS organiser_url text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS licensed text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS norm_created_at timestamptz;

-- Backfill date_from from sort_date where possible
UPDATE public.events SET date_from = sort_date WHERE sort_date IS NOT NULL AND date_from IS NULL;

-- Indexes (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS events_norm_id_key ON public.events (norm_id) WHERE norm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events (slug);
CREATE INDEX IF NOT EXISTS events_date_from_idx ON public.events (date_from);
CREATE INDEX IF NOT EXISTS events_lat_lng_idx ON public.events (lat, lng);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);

-- Update RPC to use new column names while keeping return field names stable
CREATE OR REPLACE FUNCTION public.events_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_max_results integer DEFAULT 500
)
RETURNS TABLE(
  id uuid,
  name text,
  date_raw text,
  town text,
  county text,
  distance_type text,
  entry_fee text,
  url text,
  is_featured boolean,
  distance_miles double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  select q.id, q.name, q.date_raw, q.town, q.county,
         q.distance_type, q.entry_fee, q.url, q.is_featured,
         q.distance_miles
  from (
    select e.id, e.name, e.date_raw, e.town, e.county,
           e.distances     as distance_type,
           e.entry_fee,
           e.entry_url     as url,
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
      and e.lat between p_lat - (p_radius_miles / 69.0)
                    and p_lat + (p_radius_miles / 69.0)
      and e.lng between p_lng - (p_radius_miles / (69.0 * cos(radians(p_lat))))
                    and p_lng + (p_radius_miles / (69.0 * cos(radians(p_lat))))
  ) q
  where q.distance_miles <= p_radius_miles
  order by q.distance_miles asc
  limit p_max_results;
$function$;
