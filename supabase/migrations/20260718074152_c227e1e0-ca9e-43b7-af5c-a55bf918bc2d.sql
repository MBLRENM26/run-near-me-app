-- Function: on new organisation_event_links row, write the mandatory initial
-- 'proposed' audit row in the same transaction. Idempotent by link_id so an
-- explicit caller that already wrote its own audit row is not duplicated.
CREATE OR REPLACE FUNCTION public.organisation_event_links_initial_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_identity text;
BEGIN
  -- Idempotency guard: never duplicate an existing audit row for this link.
  IF EXISTS (
    SELECT 1 FROM public.organisation_event_link_reviews
    WHERE link_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Caller supplies provenance via a per-transaction GUC:
  --   SET LOCAL app.reviewer_identity = 'seed:orl-queue-sha256:...';
  -- Falls back to a system marker so the audit row is never missing.
  BEGIN
    v_identity := current_setting('app.reviewer_identity', true);
  EXCEPTION WHEN OTHERS THEN
    v_identity := NULL;
  END;
  IF v_identity IS NULL OR length(btrim(v_identity)) = 0 THEN
    v_identity := 'system:auto-initial-proposed';
  END IF;

  INSERT INTO public.organisation_event_link_reviews
    (link_id, action, note, reviewed_by, reviewer_identity, created_at)
  VALUES
    (NEW.id,
     'proposed',
     'Initial proposed audit row auto-recorded on link insert.',
     NULL,
     v_identity,
     NEW.created_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organisation_event_links_initial_audit
  ON public.organisation_event_links;

CREATE TRIGGER organisation_event_links_initial_audit
AFTER INSERT ON public.organisation_event_links
FOR EACH ROW
EXECUTE FUNCTION public.organisation_event_links_initial_audit();