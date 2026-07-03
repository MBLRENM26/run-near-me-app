
CREATE TYPE public.event_governance AS ENUM (
  'england_athletics','scottish_athletics','welsh_athletics',
  'athletics_ni','tra','arc','fra','wfra','sha','parkrun',
  'unlicensed','unknown'
);

CREATE TYPE public.event_organiser_type AS ENUM (
  'club','commercial','charity','parkrun','community','governing_body','unknown'
);

CREATE TYPE public.event_race_profile AS ENUM (
  'road_race','trail_race','fell_race','ultra','multi_terrain',
  'track','cross_country','parkrun','virtual','other'
);

ALTER TABLE public.events
  ADD COLUMN governance      public.event_governance,
  ADD COLUMN organiser_type  public.event_organiser_type,
  ADD COLUMN race_profile    public.event_race_profile;

CREATE INDEX events_governance_idx     ON public.events (governance)     WHERE status = 'ACTIVE';
CREATE INDEX events_organiser_type_idx ON public.events (organiser_type) WHERE status = 'ACTIVE';
CREATE INDEX events_race_profile_idx   ON public.events (race_profile)   WHERE status = 'ACTIVE';
