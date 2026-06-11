CREATE TABLE public.event_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  edited_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL,
  note text
);

CREATE INDEX event_edits_event_id_idx ON public.event_edits(event_id);
CREATE INDEX event_edits_edited_at_idx ON public.event_edits(edited_at DESC);

GRANT ALL ON public.event_edits TO service_role;

ALTER TABLE public.event_edits ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: this table is only accessed via service_role
-- from admin server functions gated by requireAdminOrThrow().
CREATE POLICY "service_role_full_access" ON public.event_edits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
