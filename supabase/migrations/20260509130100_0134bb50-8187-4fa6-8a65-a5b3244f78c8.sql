ALTER TABLE public.events ADD COLUMN is_upcoming boolean NOT NULL DEFAULT false;
CREATE INDEX idx_events_is_upcoming ON public.events(is_upcoming) WHERE is_upcoming = true;