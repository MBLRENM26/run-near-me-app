CREATE TABLE public.event_course_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('strava', 'plotaroute')),
  provider_route_id text NOT NULL,
  route_name text NOT NULL,
  distance_key text NOT NULL,
  distance_label text NOT NULL,
  distance_km numeric(8, 3),
  ascent_m integer,
  route_url text NOT NULL,
  embed_url text NOT NULL,
  organiser_source_url text NOT NULL,
  source_checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'review', 'retired')),
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, provider, provider_route_id)
);

CREATE INDEX event_course_sources_event_status_idx
  ON public.event_course_sources (event_id, status);

ALTER TABLE public.event_course_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_course_sources FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.event_course_sources IS
  'Organiser-designated course metadata. Stores route links and sourced measurements only; never copied route geometry.';

CREATE TABLE public.course_source_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  source_url text,
  provider text,
  provider_route_id text,
  route_name text,
  reason text NOT NULL,
  detail text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE NULLS NOT DISTINCT (event_id, source_url, provider, provider_route_id, reason)
);

CREATE INDEX course_source_reviews_unresolved_idx
  ON public.course_source_reviews (last_seen_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.course_source_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_source_reviews FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.course_source_reviews IS
  'Admin-only queue for ambiguous or invalid organiser course-source evidence.';
