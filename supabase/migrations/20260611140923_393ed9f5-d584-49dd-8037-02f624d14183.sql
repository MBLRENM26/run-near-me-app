ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS distance_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS terrain_tags  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_curated_tags boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS events_distance_tags_gin ON public.events USING GIN (distance_tags);
CREATE INDEX IF NOT EXISTS events_terrain_tags_gin  ON public.events USING GIN (terrain_tags);