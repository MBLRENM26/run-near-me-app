CREATE TABLE public.race_research_batches (
 id uuid PRIMARY KEY, file_sha256 text NOT NULL UNIQUE CHECK (file_sha256 ~ '^[a-f0-9]{64}$'), evidence_file_sha256 text NOT NULL CHECK (evidence_file_sha256 ~ '^[a-f0-9]{64}$'), label text NOT NULL, status text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','withdrawn')), row_count integer NOT NULL, assertion_count integer NOT NULL, limitations text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.race_research_batches TO service_role;
REVOKE ALL ON public.race_research_batches FROM anon, authenticated;
ALTER TABLE public.race_research_batches ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.race_research_assertions (
 id uuid PRIMARY KEY, batch_id uuid NOT NULL REFERENCES public.race_research_batches(id), event_id uuid REFERENCES public.events(id), slug text NOT NULL, field text NOT NULL CHECK (field IN ('start_time','chip_timed','course_profile','total_climb_m','surface','laps','cut_off','min_age','wheelchair_friendly','buggy_friendly','dogs_allowed','canicross','parking','public_transport','ugr_licence','entries_status','course_map_url')), candidate_value jsonb, raw_value text NOT NULL, evidence_quote text NOT NULL CHECK (length(evidence_quote) BETWEEN 1 AND 240), source_url text NOT NULL, checked_at timestamptz NOT NULL, researcher_confidence text NOT NULL, match_state text NOT NULL CHECK (match_state IN ('needs_edition_review','unresolved','quarantined')), caveats jsonb NOT NULL DEFAULT '[]', occurrence_snapshot jsonb, supersedes_id uuid REFERENCES public.race_research_assertions(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,slug,field,raw_value,source_url,checked_at)
);
GRANT SELECT, INSERT ON public.race_research_assertions TO service_role;
REVOKE ALL ON public.race_research_assertions FROM anon, authenticated;
ALTER TABLE public.race_research_assertions ENABLE ROW LEVEL SECURITY;
CREATE INDEX race_research_assertions_batch_idx ON public.race_research_assertions(batch_id,slug,field);
CREATE TABLE public.race_research_fact_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assertion_id uuid NOT NULL REFERENCES public.race_research_assertions(id), action text NOT NULL CHECK (action IN ('hold','reject','reopen')), note text NOT NULL CHECK (length(btrim(note)) BETWEEN 1 AND 2000), reviewer_identity text NOT NULL CHECK (length(btrim(reviewer_identity))>0), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.race_research_fact_reviews TO service_role;
REVOKE ALL ON public.race_research_fact_reviews FROM anon, authenticated;
ALTER TABLE public.race_research_fact_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX race_research_fact_reviews_assertion_idx ON public.race_research_fact_reviews(assertion_id,created_at DESC);
CREATE FUNCTION public.race_research_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'research_evidence_and_reviews_are_immutable'; END $$;
REVOKE ALL ON FUNCTION public.race_research_immutable() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER race_research_assertions_immutable BEFORE UPDATE OR DELETE ON public.race_research_assertions FOR EACH ROW EXECUTE FUNCTION public.race_research_immutable();
CREATE TRIGGER race_research_fact_reviews_immutable BEFORE UPDATE OR DELETE ON public.race_research_fact_reviews FOR EACH ROW EXECUTE FUNCTION public.race_research_immutable();