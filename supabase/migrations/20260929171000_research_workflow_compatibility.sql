-- One private review queue over both intake formats. Existing reports and endpoint survive.
create view public.research_review_queue with (security_invoker=true) as
select id,'research'::text as origin,source_id,run_id,evidence,proposal,conflicts,status,review_note,created_at
from public.source_research_observations
union all
select id,'change_feed'::text,null::uuid,null::uuid,
  jsonb_build_object('source_url',source_url,'final_url',source_url,'captured_at',observed_at,
    'extractor','original change report (page capture unavailable)',
    'summary','Reported change: ' || field || ' from ' || coalesce(old_value,'(empty)') || ' to ' || coalesce(new_value,'(empty)')),
  jsonb_build_object('kind','legacy_report','event_id',event_id,'field',field,'expected_value',old_value,'proposed_value',new_value),
  '["Verify source evidence and the race occurrence before preparing an applicable correction."]'::jsonb,
  case status when 'accepted' then 'applied' when 'unknown' then 'held' else status end,
  admin_note,created_at
from public.source_change_reports;
revoke all on public.research_review_queue from public,anon,authenticated;
grant select on public.research_review_queue to service_role;

-- Manual edits fail atomically if a reviewed field/date would be held by the importer guard.
-- The application validates values; this service-only RPC independently limits editable columns.
create function public.update_admin_event_checked(_id uuid,_patch jsonb,_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.events; k text; v jsonb; diff jsonb:='{}'; assignments text;
  previous_mode text:=coalesce(current_setting('renm.review_write_mode',true),'');
begin
  if jsonb_typeof(_patch) is distinct from 'object' then raise exception 'invalid_patch'; end if;
  select * into e from public.events where id=_id for update;
  if not found then raise exception 'Event not found'; end if;
  for k,v in select key,value from jsonb_each(_patch) loop
    if k <> all(array['name','slug','date_raw','sort_date','date_from','date_to','date_is_estimated','is_recurring','is_upcoming','is_featured','town','county','region','country','location_raw','lat','lng','distances','discipline','entry_fee','organiser','entry_url','organiser_url','source','source_url','licensed','status','duplicate_of','distance_tags','terrain_tags','is_curated_tags','governance','organiser_type','race_profile']) then
      raise exception 'unsupported_admin_field: %',k;
    end if;
    if to_jsonb(e)->k is distinct from v then diff:=diff||jsonb_build_object(k,jsonb_build_object('from',to_jsonb(e)->k,'to',v)); end if;
  end loop;
  if diff='{}'::jsonb then return jsonb_build_object('ok',true,'changed',0); end if;
  select string_agg(format('%I=p.%I',key,key),',') into assignments from jsonb_each(_patch);
  perform set_config('renm.review_write_mode','strict',true);
  execute format('update public.events e set %s from jsonb_populate_record(null::public.events,$1) p where e.id=$2',assignments) using _patch,_id;
  perform set_config('renm.review_write_mode',previous_mode,true);
  insert into public.event_edits(event_id,changes,note) values(_id,diff,_note);
  return jsonb_build_object('ok',true,'changed',(select count(*) from jsonb_object_keys(diff)));
end $$;
revoke all on function public.update_admin_event_checked(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.update_admin_event_checked(uuid,jsonb,text) to service_role;

-- Preserve ORL acceptance and audit logic; make protection conflicts explicit and atomic.
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
  v_previous_write_mode text := coalesce(current_setting('renm.review_write_mode',true),'');
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
  PERFORM set_config('renm.review_write_mode','strict',true);
  UPDATE public.events
  SET organiser = v_canonical
  WHERE id = v_event.id;
  PERFORM set_config('renm.review_write_mode',v_previous_write_mode,true);

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