CREATE OR REPLACE FUNCTION public.organisation_event_links_initial_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_identity text;
BEGIN
  -- Enforce seed contract: new links must enter the review queue as 'proposed'.
  -- Later state transitions (accepted/rejected/reopened) must go through the
  -- review RPC, not a direct INSERT.
  IF NEW.review_status IS DISTINCT FROM 'proposed' THEN
    RAISE EXCEPTION
      'New organisation event links must be inserted with review_status = proposed'
      USING ERRCODE = '22023';
  END IF;

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
$function$;