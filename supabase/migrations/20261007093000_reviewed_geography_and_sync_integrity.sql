-- Extend the existing evidence/review/reversal workflow; no parallel truth store.
ALTER TABLE public.event_reviewed_fields DROP CONSTRAINT event_reviewed_fields_field_check;
ALTER TABLE public.event_reviewed_fields ADD CONSTRAINT event_reviewed_fields_field_check
 CHECK (field IN ('entry_url','organiser_url','organiser','organiser_club_id','distances','name','location_raw','town','county','region','country','lat','lng'));
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
        if f not in ('entry_url','organiser_url','distances','name','organiser','location_raw','town','county','region','country','lat','lng') or not(p ? 'expected_value') then raise exception 'unsupported_field'; end if;
        if to_jsonb(e)->f is distinct from p->'expected_value' then raise exception 'stale_expected_value'; end if;
        if f in ('lat','lng') then
          if jsonb_typeof(p->'proposed_value') is distinct from 'number' then raise exception 'invalid_coordinate'; end if;
          if abs((p->>'proposed_value')::numeric) > (case when f='lat' then 90 else 180 end) then raise exception 'invalid_coordinate'; end if;
        elsif f in ('organiser','location_raw','town','county','region','country') then
          if jsonb_typeof(p->'proposed_value') is distinct from 'string' or length(btrim(p->>'proposed_value'))=0
            or length(p->>'proposed_value') > (case when f in ('organiser','location_raw') then 500 else 200 end) then raise exception 'invalid_reviewed_text'; end if;
        elsif f='name' then
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
      location_raw=case when patch ? 'location_raw' then patch->>'location_raw' else location_raw end,
      town=case when patch ? 'town' then patch->>'town' else town end,
      county=case when patch ? 'county' then patch->>'county' else county end,
      region=case when patch ? 'region' then patch->>'region' else region end,
      country=case when patch ? 'country' then patch->>'country' else country end,
      lat=case when patch ? 'lat' then (patch->>'lat')::double precision else lat end,
      lng=case when patch ? 'lng' then (patch->>'lng')::double precision else lng end,
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

-- Persist the before/after assurance result in the existing import history.
ALTER TABLE public.sync_runs ADD COLUMN review_integrity jsonb;

-- Read-only, service-only audit of all reviewed records. Global coverage is
-- intentional: a source may touch a canonical record belonging to another source.
-- Missing event/guard rows must not turn a failed check into a green zero count.
CREATE FUNCTION public.get_sync_review_snapshot() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $audit$
WITH field_checks AS (
 SELECT g.event_id,g.field,g.value AS expected,to_jsonb(e)->g.field AS actual
 FROM event_reviewed_fields g LEFT JOIN events e ON e.id=g.event_id
), occurrence_checks AS (
 SELECT DISTINCT g.event_id,'occurrence_dates'::text AS field,g.occurrence AS expected,
  CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object('date_from',e.date_from,'date_to',e.date_to,'sort_date',e.sort_date) END AS actual
 FROM event_reviewed_fields g LEFT JOIN events e ON e.id=g.event_id
), latest_status AS (
 SELECT DISTINCT ON (a.event_id) a.event_id,a.changes->'status'->>'to' AS reviewed_status
 FROM event_edits a WHERE a.changes ? 'status'
 ORDER BY a.event_id,a.edited_at DESC,a.id DESC
), latest_target AS (
 SELECT DISTINCT ON (a.event_id) a.event_id,a.changes->'duplicate_of'->'to' AS target
 FROM event_edits a WHERE a.changes ? 'duplicate_of'
 ORDER BY a.event_id,a.edited_at DESC,a.id DESC
), target_checks AS (
 SELECT a.event_id,'reviewed_canonical'::text AS field,a.target AS expected,to_jsonb(e.duplicate_of) AS actual
 FROM latest_target a LEFT JOIN events e ON e.id=a.event_id WHERE a.target <> 'null'::jsonb
), lifecycle_checks AS (
 SELECT a.event_id,'reviewed_status'::text AS field,to_jsonb(a.reviewed_status) AS expected,to_jsonb(e.status) AS actual
 FROM latest_status a LEFT JOIN events e ON e.id=a.event_id WHERE a.reviewed_status IN ('CANCELLED','DUPLICATE')
), redirect_checks AS (
 SELECT e.id AS event_id,'canonical_target'::text AS field,'true'::jsonb AS expected,
  to_jsonb(coalesce(c.status='ACTIVE' AND c.duplicate_of IS NULL AND c.id<>e.id,false)) AS actual
 FROM events e LEFT JOIN events c ON c.id=e.duplicate_of WHERE e.status='DUPLICATE' AND EXISTS (SELECT 1 FROM event_edits a WHERE a.event_id=e.id AND (a.changes ? 'status' OR a.changes ? 'duplicate_of'))
), missing_guards AS (
 SELECT DISTINCT o.proposal->>'event_id' AS event_id,k.key AS field
 FROM source_research_observations o CROSS JOIN LATERAL jsonb_object_keys(o.applied_after) k(key)
 WHERE o.status='applied' AND NOT EXISTS (
  SELECT 1 FROM event_reviewed_fields g WHERE g.event_id::text=o.proposal->>'event_id' AND g.field=k.key)
), checks AS (
 SELECT * FROM field_checks UNION ALL SELECT * FROM occurrence_checks
 UNION ALL SELECT * FROM lifecycle_checks UNION ALL SELECT * FROM target_checks UNION ALL SELECT * FROM redirect_checks
), failures AS (
 SELECT event_id::text,field,expected,actual FROM checks WHERE expected IS DISTINCT FROM actual
 UNION ALL SELECT event_id,'missing_guard:'||field,'true'::jsonb,'false'::jsonb FROM missing_guards
)
SELECT jsonb_build_object(
 'checked_at',now(),'checked_fields',(SELECT count(*) FROM checks),
 'checked_events',(SELECT count(DISTINCT event_id) FROM checks),
 'violation_count',(SELECT count(*) FROM failures),
 'violations',coalesce((SELECT jsonb_agg(to_jsonb(f)) FROM (SELECT event_id,field,expected::text,actual::text FROM failures ORDER BY event_id,field LIMIT 100) f),'[]'::jsonb),
 'conflict_attempts',coalesce((SELECT sum(attempts) FROM event_review_conflicts),0)
);
$audit$;
REVOKE ALL ON FUNCTION public.get_sync_review_snapshot() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_review_snapshot() TO service_role;
