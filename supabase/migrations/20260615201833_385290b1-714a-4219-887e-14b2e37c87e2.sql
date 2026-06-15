
-- 1. tsvector column + GIN index on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(town, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(county, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS events_tsv_gin_idx ON public.events USING gin(tsv);

-- 2. search_logs
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);

GRANT INSERT ON public.search_logs TO anon, authenticated;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert search logs"
  ON public.search_logs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX search_logs_created_at_idx ON public.search_logs (created_at DESC);
CREATE INDEX search_logs_query_idx ON public.search_logs (query);

-- 3. search_clicks
CREATE TABLE public.search_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_log_id uuid NOT NULL REFERENCES public.search_logs(id) ON DELETE CASCADE,
  clicked_slug text NOT NULL,
  position int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.search_clicks TO anon, authenticated;
GRANT ALL ON public.search_clicks TO service_role;
ALTER TABLE public.search_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert search clicks"
  ON public.search_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX search_clicks_search_log_id_idx ON public.search_clicks (search_log_id);
