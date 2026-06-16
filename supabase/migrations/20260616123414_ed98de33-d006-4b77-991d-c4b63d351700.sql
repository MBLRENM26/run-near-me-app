CREATE TABLE public.sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  fetched INTEGER,
  active INTEGER,
  written INTEGER,
  new_events INTEGER,
  updated_existing INTEGER,
  skipped_dupes INTEGER,
  skipped_no_date INTEGER,
  failed_pages INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sync_runs_started_at_idx ON public.sync_runs (started_at DESC);
CREATE INDEX sync_runs_source_started_idx ON public.sync_runs (source, started_at DESC);

GRANT ALL ON public.sync_runs TO service_role;

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;