
-- =====================================================================
-- 1. clubs table
-- =====================================================================
CREATE TABLE public.clubs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norm_id              text NOT NULL UNIQUE,
  slug                 text NOT NULL UNIQUE,
  name                 text NOT NULL,
  governing_body       text NOT NULL CHECK (governing_body IN (
                         'england-athletics',
                         'scottish-athletics',
                         'welsh-athletics',
                         'athletics-ni'
                       )),
  affiliation_number   text,
  town                 text,
  county               text,
  region               text,
  country              text,
  postcode             text,
  lat                  double precision,
  lng                  double precision,
  website_url          text,
  contact_email        text,
  contact_phone        text,
  disciplines          text[] NOT NULL DEFAULT '{}',
  is_claimed           boolean NOT NULL DEFAULT false,
  claimed_by           uuid,                          -- nullable; filled when self-service auth lands
  claimed_at           timestamptz,
  last_verified_at     timestamptz,
  status               text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','HIDDEN','DELETED')),
  source               text,                          -- admin-only
  source_url           text,                          -- admin-only
  tsv                  tsvector GENERATED ALWAYS AS (
                         to_tsvector('english',
                           coalesce(name, '') || ' ' ||
                           coalesce(town, '') || ' ' ||
                           coalesce(county, '')
                         )
                       ) STORED,
  norm_created_at      timestamptz,                   -- mirrors events.norm_created_at (date listed)
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clubs_governing_body_idx ON public.clubs(governing_body);
CREATE INDEX clubs_region_idx         ON public.clubs(region);
CREATE INDEX clubs_status_idx         ON public.clubs(status);
CREATE INDEX clubs_latlng_idx         ON public.clubs(lat, lng);
CREATE INDEX clubs_tsv_idx            ON public.clubs USING GIN (tsv);

-- =====================================================================
-- 2. GRANTS on base table — service_role only.
--    No grants to anon or authenticated. All client reads go through
--    public_clubs (below); all writes go through server functions using
--    the service-role client after an explicit admin check.
-- =====================================================================
GRANT ALL ON public.clubs TO service_role;

-- =====================================================================
-- 3. RLS — enabled, but no policies for anon/authenticated.
--    service_role bypasses RLS by design.
-- =====================================================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. updated_at trigger (reuses existing pattern from other tables)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_clubs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clubs_set_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.tg_clubs_updated_at();

-- =====================================================================
-- 5. public_clubs view — the ONLY thing the website reads.
--    Excludes: source, source_url, claimed_by, contact_email, contact_phone,
--    tsv. Filters out non-active rows.
--    contact_email and contact_phone are deliberately hidden until the
--    self-service claimed-club edit UI lands; until then scraped contact
--    info never reaches the page.
-- =====================================================================
CREATE OR REPLACE VIEW public.public_clubs
WITH (security_invoker = true)
AS
SELECT
  id, slug, name,
  governing_body, affiliation_number,
  town, county, region, country, postcode,
  lat, lng,
  website_url,
  disciplines,
  is_claimed, claimed_at, last_verified_at,
  status,
  norm_created_at, created_at
FROM public.clubs
WHERE status = 'ACTIVE';

GRANT SELECT ON public.public_clubs TO anon, authenticated;
