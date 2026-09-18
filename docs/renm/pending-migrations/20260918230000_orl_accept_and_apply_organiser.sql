-- RENM — ORL Step 3: atomic "Accept & apply organiser".
--
-- PENDING / NOT APPLIED. Committed to the repository only. Activation requires
-- the normal reviewed migration/deployment step; this file is deliberately held
-- outside supabase/migrations/ because that directory is applied automatically
-- by the platform migration tool. To activate, move/apply it through the
-- reviewed migration process.
--
-- Contract: accept exactly ONE organisation_event_link whose relationship is
-- `organises` and whose review status is `proposed` or `reopened`, and — in the
-- same transaction — project the canonical organisation name onto the public
-- events.organiser field, appending the append-only review row and one
-- event_edits audit row.
--
-- Guarantees:
--  * the link row is locked FOR UPDATE before any validation;
--  * relationship must be `organises`; other relationships never project;
--  * a meaningful, conflicting events.organiser blocks with no mutation;
--  * only NULL / blank / TBC / TBA / Unknown / N/A / - / none / already-equal
--    prior values are permitted;
--  * organiser_club_id is never written (no organisation→club mapping inferred);
--  * organiser_type is never written (never guessed);
--  * retry after success is idempotent: no second review row, no second audit row;
--  * structured event_edits JSON records link_id, organisation_id, previous and
--    new organiser, relationship, source ORL, reviewer and timestamp, so a later
--    reviewed sample can be analysed for automation.

CREATE OR REPLACE FUNCTION public.accept_and_apply_organiser(
  _link_id uuid,
  _note text DEFAULT NULL,
  _reviewer_identity text DEFAULT 'admin:cookie-session'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link       public.organisation_event_links;
  v_org        public.organisations;
  v_event      public.events;
  v_prev       text;
  v_canonical  text;
  v_review_id  uuid;
BEGIN
  IF _reviewer_identity IS NULL OR btrim(_reviewer_identity) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reviewer_identity_required');
  END IF;

  SELECT * INTO v_link
  FROM public.organisation_event_links
  WHERE id = _link_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'link_not_found');
  END IF;

  IF v_link.relationship <> 'organises' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'relationship_not_organises',
      'relationship', v_link.relationship);
  END IF;

  SELECT * INTO v_org FROM public.organisations WHERE id = v_link.organisation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'organisation_not_found');
  END IF;
  v_canonical := btrim(v_org.canonical_name);

  SELECT * INTO v_event FROM public.events WHERE id = v_link.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;
  v_prev := btrim(coalesce(v_event.organiser, ''));

  -- Idempotent retry: already accepted and already projected.
  IF v_link.review_status = 'accepted' THEN
    IF lower(v_prev) = lower(v_canonical) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already_applied', true,
        'link_id', v_link.id,
        'organisation_id', v_org.id,
        'previous_organiser', v_event.organiser,
        'new_organiser', v_canonical
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'already_accepted_not_applied',
      'current_organiser', v_event.organiser);
  END IF;

  IF v_link.review_status NOT IN ('proposed', 'reopened') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'review_status', v_link.review_status);
  END IF;

  -- Never overwrite a different meaningful organiser.
  IF v_prev <> ''
     AND lower(v_prev) <> lower(v_canonical)
     AND lower(v_prev) NOT IN ('tbc', 'tba', 'unknown', 'n/a', 'na', '-', 'none') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'organiser_conflict',
      'current_organiser', v_event.organiser, 'canonical_name', v_canonical);
  END IF;

  INSERT INTO public.organisation_event_link_reviews
    (link_id, action, note, reviewed_by, reviewer_identity)
  VALUES (v_link.id, 'accepted', _note, NULL, _reviewer_identity)
  RETURNING id INTO v_review_id;

  UPDATE public.organisation_event_links
  SET review_status = 'accepted'
  WHERE id = v_link.id;

  -- Public projection: organiser text only. organiser_club_id and
  -- organiser_type are deliberately left untouched.
  UPDATE public.events
  SET organiser = v_canonical
  WHERE id = v_event.id;

  INSERT INTO public.event_edits (event_id, changes, note)
  VALUES (
    v_event.id,
    jsonb_build_object(
      'source', 'ORL',
      'action', 'accept_and_apply_organiser',
      'link_id', v_link.id,
      'organisation_id', v_org.id,
      'relationship', v_link.relationship,
      'link_confidence', v_link.confidence,
      'previous_organiser', v_event.organiser,
      'new_organiser', v_canonical,
      'reviewer_identity', _reviewer_identity,
      'review_id', v_review_id,
      'applied_at', now()
    ),
    coalesce(
      nullif(btrim(coalesce(_note, '')), ''),
      'Organiser applied from an accepted ORL organises relationship.'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_applied', false,
    'link_id', v_link.id,
    'organisation_id', v_org.id,
    'review_id', v_review_id,
    'previous_organiser', v_event.organiser,
    'new_organiser', v_canonical
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_and_apply_organiser(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_and_apply_organiser(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.accept_and_apply_organiser(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.accept_and_apply_organiser(uuid, text, text) TO service_role;
