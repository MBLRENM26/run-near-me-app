
-- Add seen_at to submissions and club_claims so the admin UI can show
-- unseen counts even when email fails.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;
CREATE INDEX IF NOT EXISTS submissions_seen_at_idx
  ON public.submissions (seen_at)
  WHERE seen_at IS NULL;

ALTER TABLE public.club_claims
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;
CREATE INDEX IF NOT EXISTS club_claims_seen_at_idx
  ON public.club_claims (seen_at)
  WHERE seen_at IS NULL;

-- Lightweight table for future dedup-candidate tracking from sync engines.
CREATE TABLE IF NOT EXISTS public.sync_dedupe_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  sync_run_id uuid REFERENCES public.sync_runs(id) ON DELETE SET NULL,
  incoming_name text NOT NULL,
  incoming_town text,
  incoming_date date,
  matched_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  reason text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sync_dedupe_candidates TO service_role;
ALTER TABLE public.sync_dedupe_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
  ON public.sync_dedupe_candidates FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS sync_dedupe_candidates_run_idx
  ON public.sync_dedupe_candidates (sync_run_id);
CREATE INDEX IF NOT EXISTS sync_dedupe_candidates_unresolved_idx
  ON public.sync_dedupe_candidates (created_at DESC)
  WHERE resolved_at IS NULL;
