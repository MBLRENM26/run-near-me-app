ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_type text,
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_relationship text,
  ADD COLUMN IF NOT EXISTS proposed_new_date date;

ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_kind_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_kind_check
  CHECK (kind = ANY (ARRAY['listing'::text, 'claim'::text, 'edit'::text]));

ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_change_type_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_change_type_check
  CHECK (change_type IS NULL OR change_type = ANY (ARRAY['date'::text, 'cancelled'::text, 'link'::text, 'details'::text, 'other'::text]));

CREATE INDEX IF NOT EXISTS submissions_event_id_idx ON public.submissions(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS submissions_kind_status_idx ON public.submissions(kind, status);

-- Relax the RLS insert policy so 'edit' rows (which use short structured
-- fields rather than a long event_details blob) can be inserted by anon.
DROP POLICY IF EXISTS "Anyone can submit" ON public.submissions;
CREATE POLICY "Anyone can submit" ON public.submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (
      (kind = 'listing' AND char_length(event_details) BETWEEN 10 AND 2000)
      OR (kind = 'claim')
      OR (kind = 'edit' AND event_id IS NOT NULL AND char_length(event_details) BETWEEN 1 AND 2000)
    )
  );