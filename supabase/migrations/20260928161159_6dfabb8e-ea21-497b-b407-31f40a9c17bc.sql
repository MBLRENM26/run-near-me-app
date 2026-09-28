CREATE TABLE public.source_change_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field text NOT NULL CHECK (field IN ('date_from','entry_url','entries_status','event_status')),
  old_value text,
  new_value text,
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  reporter text NOT NULL DEFAULT 'homelab',
  fingerprint text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','unknown')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.source_change_reports TO service_role;
ALTER TABLE public.source_change_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX source_change_reports_status_idx ON public.source_change_reports(status, created_at DESC);