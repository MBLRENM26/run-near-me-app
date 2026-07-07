ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organiser_club_id uuid
  REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_organiser_club_id_idx
  ON public.events (organiser_club_id)
  WHERE organiser_club_id IS NOT NULL;