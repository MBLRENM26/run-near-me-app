DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_norm_id_unique' AND conrelid = 'public.events'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.events'::regclass AND attname = 'norm_id')]
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_norm_id_unique UNIQUE (norm_id);
  END IF;
END $$;