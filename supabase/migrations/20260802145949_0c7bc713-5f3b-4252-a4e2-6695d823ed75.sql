CREATE VIEW public.events_public_v1
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  e.id,
  e.slug,
  e.name,
  e.date_raw,
  e.sort_date,
  e.date_from,
  e.date_to,
  e.date_is_estimated,
  e.is_recurring,
  e.town,
  e.county,
  e.region,
  e.country,
  e.lat,
  e.lng,
  e.distances,
  e.distance_tags,
  e.terrain_tags,
  e.entry_fee,
  e.entry_url,
  e.organiser_url,
  e.is_featured,
  e.governance,
  e.organiser_type,
  e.race_profile
FROM public.events e
WHERE e.status = 'ACTIVE';

REVOKE ALL ON public.events_public_v1 FROM PUBLIC;

GRANT SELECT ON public.events_public_v1 TO anon;
GRANT SELECT ON public.events_public_v1 TO authenticated;

COMMENT ON VIEW public.events_public_v1 IS 'L3A v1 public-column boundary for public.events. Exposes only approved public columns and rows with status = ''ACTIVE''. This does NOT represent the final discovery-eligibility contract (date, duplicate, link-trust, quarantine, terminal-state and destination-validity rules are out of scope for L3A). Unused by application consumers as of L3A.';