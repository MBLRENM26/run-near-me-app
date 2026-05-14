
create index if not exists events_lat_lng_idx
  on public.events (latitude, longitude)
  where latitude is not null and longitude is not null;

create or replace function public.events_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_max_results int default 500
)
returns table (
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
language sql
stable
security invoker
set search_path = public
as $$
  select q.id, q.name, q.date_raw, q.town, q.county,
         q.distance_type, q.entry_fee, q.url, q.is_featured,
         q.distance_miles
  from (
    select e.id, e.name, e.date_raw, e.town, e.county,
           e.distance_type, e.entry_fee, e.url, e.is_featured,
           (2 * 3958.7613 * asin(sqrt(
             power(sin(radians(e.latitude - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(e.latitude))
               * power(sin(radians(e.longitude - p_lng) / 2), 2)
           ))) as distance_miles
    from public.events e
    where e.latitude is not null
      and e.longitude is not null
      and e.latitude  between p_lat - (p_radius_miles / 69.0)
                          and p_lat + (p_radius_miles / 69.0)
      and e.longitude between p_lng - (p_radius_miles / (69.0 * cos(radians(p_lat))))
                          and p_lng + (p_radius_miles / (69.0 * cos(radians(p_lat))))
  ) q
  where q.distance_miles <= p_radius_miles
  order by q.distance_miles asc
  limit p_max_results;
$$;

grant execute on function public.events_within_radius(double precision, double precision, double precision, int) to anon, authenticated;

notify pgrst, 'reload schema';
