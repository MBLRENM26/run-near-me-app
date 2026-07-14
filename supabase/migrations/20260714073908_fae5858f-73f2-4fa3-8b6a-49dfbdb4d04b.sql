
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS race_name text,
  ADD COLUMN IF NOT EXISTS race_date date,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS distances text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS organiser text,
  ADD COLUMN IF NOT EXISTS terrain text,
  ADD COLUMN IF NOT EXISTS submitted_entry_fee text,
  ADD COLUMN IF NOT EXISTS created_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS submissions_created_event_id_idx
  ON public.submissions(created_event_id) WHERE created_event_id IS NOT NULL;

-- Daily spam purge: keep the audit trail for rejected rows, but delete spam
-- older than 30 days so the table stays tidy.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-spam-submissions-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-spam-submissions-daily',
  '0 3 * * *',
  $cron$ DELETE FROM public.submissions WHERE status = 'spam' AND submitted_at < now() - interval '30 days'; $cron$
);
