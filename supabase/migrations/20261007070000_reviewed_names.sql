-- Protect explicitly reviewed display names from stale source-feed titles.
-- Keep source IDs and public slugs unchanged; occurrence/reversal guards still apply.
-- No source schedules, ORL links, lifecycle actions or automatic approvals change.
ALTER TABLE public.event_reviewed_fields DROP CONSTRAINT event_reviewed_fields_field_check;
ALTER TABLE public.event_reviewed_fields ADD CONSTRAINT event_reviewed_fields_field_check CHECK (field IN ('entry_url','organiser_url','organiser','organiser_club_id','distances','name'));

CREATE OR REPLACE FUNCTION public.review_source_research(_id uuid, _action text, _note text, _reviewer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r public.source_research_observations; e public.events; p jsonb; patch jsonb; before_patch jsonb:='{}';
  prior jsonb:='[]'; f text; val jsonb; org public.organisations; club uuid; evidence_id uuid; link_id uuid;
  result jsonb; current_json jsonb; lock_row public.event_reviewed_fields;
begin
  if length(btrim(coalesce(_note,'')))=0 or length(btrim(coalesce(_reviewer,'')))=0 then raise exception 'review_note_and_identity_required'; end if;
  select * into r from public.source_research_observations where id=_id for update;
  if not found then raise exception 'observation_not_found'; end if;
  if _action not in ('hold','reject','apply','revert') then raise exception 'invalid_action'; end if;
  if (_action='apply' and r.status='applied') or (_action='revert' and r.status='reverted') then return jsonb_build_object('ok',true,'already_done',true); end if;
  if _action in ('hold','reject') then
    if r.status not in ('pending','held') then raise exception 'invalid_transition'; end if;
    update public.source_research_observations set status=case when _action='hold' then 'held' else 'rejected' end,review_note=_note where id=_id;
  else
    p:=r.proposal;
    -- Database is authoritative even if called without the TypeScript layer.
    if p->>'kind' not in ('event_change','club_relationship') then raise exception 'requires_separate_occurrence_or_lifecycle_review'; end if;
    select * into e from public.events where id=(p->>'event_id')::uuid for update;
    if not found then raise exception 'event_not_found'; end if;
    if _action='apply' then
      if r.status not in ('pending','held') or jsonb_array_length(r.conflicts)>0 then raise exception 'unresolved_conflicts'; end if;
      if e.status<>'ACTIVE' or e.sort_date is distinct from (p->>'expected_date')::date
        or e.date_from is distinct from (p->>'expected_date')::date then raise exception 'stale_or_ineligible_occurrence'; end if;
      if p->>'kind'='event_change' then
        f:=p->>'field';
        if f not in ('entry_url','organiser_url','distances','name') or not(p ? 'expected_value') then raise exception 'unsupported_field'; end if;
        if to_jsonb(e)->f is distinct from p->'expected_value' then raise exception 'stale_expected_value'; end if;
        if f='name' then
          if jsonb_typeof(p->'proposed_value') is distinct from 'string'
            or length(btrim(p->>'proposed_value'))=0
            or length(p->>'proposed_value')>300 then raise exception 'invalid_name'; end if;
        elsif f='distances' then
          if jsonb_typeof(p->'proposed_value') is distinct from 'string'
            or length(btrim(p->>'proposed_value'))=0
            or length(p->>'proposed_value')>500 then raise exception 'invalid_distances'; end if;
        else
          if coalesce(p->>'proposed_value','') !~ '^https?://[^/@[:space:]]+([/?#]|$)' or length(p->>'proposed_value')>2000 then raise exception 'invalid_destination'; end if;
        end if;
        patch:=jsonb_build_object(f,p->'proposed_value');
      else
        club:=(p->>'club_id')::uuid;
        if not(p ? 'expected_organiser') or not(p ? 'expected_club_id')
          or to_jsonb(e)->'organiser' is distinct from p->'expected_organiser'
          or to_jsonb(e)->'organiser_club_id' is distinct from p->'expected_club_id' then raise exception 'stale_expected_value'; end if;
        select * into org from public.organisations where id=(p->>'organisation_id')::uuid and status='approved' for share;
        if not found then raise exception 'approved_organisation_required'; end if;
        perform 1 from public.organisation_club_links where organisation_id=org.id and club_id=club and review_status='accepted' for share;
        if not found then raise exception 'accepted_club_crosswalk_required'; end if;
        if (select count(*) from public.organisation_club_links where review_status='accepted' and (club_id=club or organisation_id=org.id))<>1 then raise exception 'ambiguous_crosswalk'; end if;
        if e.organiser_club_id is not null and e.organiser_club_id<>club then raise exception 'club_conflict'; end if;
        if exists(select 1 from public.organisation_event_links where event_id=e.id and relationship='organises' and review_status='accepted' and organisation_id<>org.id) then raise exception 'joint_organiser_requires_review'; end if;
        -- Lock existing ORL link before mutating it. Previously accepted links
        -- need their own audit/reversal path; never adopt them silently.
        select id into link_id from public.organisation_event_links where event_id=e.id and organisation_id=org.id and relationship='organises' for update;
        if found then raise exception 'existing_orl_link_requires_review'; end if;
        insert into public.identity_evidence(source_url,captured_at,evidence_type,supporting_fact)
        values(r.evidence->>'final_url',(r.evidence->>'captured_at')::timestamptz,'manual_observation',r.evidence->>'summary')
        on conflict(fingerprint) do update set supporting_fact=excluded.supporting_fact returning id into evidence_id;
        insert into public.organisation_event_links(event_id,organisation_id,relationship,confidence)
        values(e.id,org.id,'organises','verified') returning id into link_id;
        insert into public.organisation_event_link_evidence values(link_id,evidence_id,now());
        patch:=jsonb_build_object('organiser',org.canonical_name,'organiser_club_id',club);
      end if;
      for f,val in select key,value from jsonb_each(patch) loop
        before_patch:=before_patch || jsonb_build_object(f,to_jsonb(e)->f);
        select * into lock_row from public.event_reviewed_fields where event_id=e.id and field=f;
        if found then prior:=prior || jsonb_build_array(to_jsonb(lock_row)); end if;
        insert into public.event_reviewed_fields(event_id,field,value,occurrence,observation_id)
        values(e.id,f,val,jsonb_build_object('date_from',e.date_from,'date_to',to_jsonb(e)->'date_to','sort_date',e.sort_date),r.id)
        on conflict(event_id,field) do update set value=excluded.value,occurrence=excluded.occurrence,observation_id=excluded.observation_id;
      end loop;
      if p->>'kind'='club_relationship' then
        result:=public.accept_and_apply_organiser(link_id,_note,_reviewer);
        if not coalesce((result->>'ok')::boolean,false) then raise exception 'organiser_apply_refused: %',result->>'error'; end if;
      end if;
    else
      if r.status<>'applied' then raise exception 'invalid_transition'; end if;
      for f,val in select key,value from jsonb_each(r.applied_after) loop
        if to_jsonb(e)->f is distinct from val or not exists(select 1 from public.event_reviewed_fields where event_id=e.id and field=f and observation_id=r.id) then raise exception 'stale_reversal'; end if;
      end loop;
      patch:=r.applied_before; before_patch:=r.applied_after;
      delete from public.event_reviewed_fields where event_id=e.id and observation_id=r.id;
      insert into public.event_reviewed_fields select * from jsonb_populate_recordset(null::public.event_reviewed_fields,r.prior_locks);
      if r.orl_link_id is not null then
        perform public.review_organisation_event_link_txn(r.orl_link_id,'reopened',_note,null,_reviewer);
      end if;
    end if;
    update public.events set
      name=case when patch ? 'name' then patch->>'name' else name end,
      entry_url=case when patch ? 'entry_url' then patch->>'entry_url' else entry_url end,
      organiser_url=case when patch ? 'organiser_url' then patch->>'organiser_url' else organiser_url end,
      organiser=case when patch ? 'organiser' then patch->>'organiser' else organiser end,
      distances=case when patch ? 'distances' then patch->>'distances' else distances end,
      organiser_club_id=case when patch ? 'organiser_club_id' then (patch->>'organiser_club_id')::uuid else organiser_club_id end
    where id=e.id returning to_jsonb(events.*) into current_json;
    for f,val in select key,value from jsonb_each(patch) loop
      if current_json->f is distinct from val then raise exception 'projection_not_applied'; end if;
    end loop;
    insert into public.event_edits(event_id,changes,note) values(e.id,jsonb_build_object('source','source-research','action',_action,'observation_id',r.id,'before',before_patch,'after',patch,'reviewer',_reviewer),_note);
    update public.source_research_observations set status=case when _action='apply' then 'applied' else 'reverted' end,
      review_note=_note,applied_before=case when _action='apply' then before_patch else applied_before end,
      applied_after=case when _action='apply' then patch else applied_after end,
      prior_locks=case when _action='apply' then prior else prior_locks end,
      orl_link_id=case when _action='apply' then link_id else orl_link_id end where id=r.id;
  end if;
  insert into public.source_research_reviews(observation_id,action,note,reviewer_identity) values(r.id,_action,_note,_reviewer);
  return jsonb_build_object('ok',true);
end $function$
;
