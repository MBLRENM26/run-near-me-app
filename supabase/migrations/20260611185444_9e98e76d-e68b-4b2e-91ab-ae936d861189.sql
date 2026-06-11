ALTER TABLE public.events ADD COLUMN IF NOT EXISTS series_key text;
CREATE INDEX IF NOT EXISTS events_series_key_idx ON public.events (series_key) WHERE series_key IS NOT NULL;