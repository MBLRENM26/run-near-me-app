-- An audited cancellation or duplicate redirect must survive unattended imports.
-- Deliberate changes still use the existing audited admin RPC; no new write grants.
CREATE FUNCTION public.protect_reviewed_event_lifecycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF current_setting('renm.review_write_mode',true)='strict'
    OR old.status NOT IN ('CANCELLED','DUPLICATE') THEN RETURN new; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.event_edits a WHERE a.event_id=old.id AND (
      a.changes->'status'->>'to'=old.status OR
      (old.status='DUPLICATE' AND old.duplicate_of IS NOT NULL
       AND a.changes->'duplicate_of'->>'to'=old.duplicate_of::text)
    )
  ) THEN RETURN new; END IF;
  -- Do not attach a new edition to an old reviewed cancellation/redirect.
  -- A normal same-edition metadata refresh remains possible.
  IF new.status IS DISTINCT FROM old.status
    OR new.duplicate_of IS DISTINCT FROM old.duplicate_of
    OR new.date_from IS DISTINCT FROM old.date_from
    OR new.date_to IS DISTINCT FROM old.date_to
    OR new.sort_date IS DISTINCT FROM old.sort_date THEN RETURN old; END IF;
  RETURN new;
END $$;
CREATE TRIGGER zy_protect_reviewed_event_lifecycle BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.protect_reviewed_event_lifecycle();
REVOKE ALL ON FUNCTION public.protect_reviewed_event_lifecycle() FROM public,anon,authenticated;
