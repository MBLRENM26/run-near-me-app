-- Evidence intake is private. A crawl cannot publish a race or accept a link.
create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null unique check (url ~ '^https?://'),
  role text not null check (role in ('club','organiser','entry_provider','governing_body','community','unresolved')),
  page_type text not null check (page_type in ('listing','race','entry','other')),
  organisation_id uuid references public.organisations(id),
  club_id uuid references public.clubs(id),
  policy_note text not null check (length(btrim(policy_note)) > 0),
  enabled boolean not null default false,
  interval_hours integer not null default 168 check (interval_hours between 24 and 2160),
  created_at timestamptz not null default now()
);

-- Explicit identity mapping. Joint/ambiguous mappings can be held, but public
-- projection below requires exactly one accepted mapping on each side.
create table public.organisation_club_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  club_id uuid not null references public.clubs(id),
  evidence_id uuid not null references public.identity_evidence(id),
  review_status text not null default 'proposed' check (review_status in ('proposed','accepted','held','rejected')),
  reviewer_identity text,
  reviewed_at timestamptz,
  unique (organisation_id,club_id),
  check (review_status <> 'accepted' or (reviewer_identity is not null and reviewed_at is not null))
);

create table public.source_research_observations (
  id uuid primary key,
  source_id uuid not null references public.research_sources(id),
  run_id uuid not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  proposal jsonb not null check (proposal->>'kind' in ('page_change','event_change','new_occurrence','club_relationship')),
  conflicts jsonb not null default '[]' check (jsonb_typeof(conflicts) = 'array'),
  status text not null default 'pending' check (status in ('pending','held','applied','rejected','reverted')),
  review_note text,
  applied_before jsonb,
  applied_after jsonb,
  prior_locks jsonb,
  orl_link_id uuid references public.organisation_event_links(id),
  created_at timestamptz not null default now()
);
create index source_research_status on public.source_research_observations(status,created_at desc);
create table public.source_research_reviews (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.source_research_observations(id),
  action text not null,
  note text not null,
  reviewer_identity text not null,
  created_at timestamptz not null default now()
);
create trigger source_research_reviews_immutable before update or delete on public.source_research_reviews
for each row execute function public.organisation_event_link_reviews_immutable();

create table public.event_reviewed_fields (
  event_id uuid not null references public.events(id),
  field text not null check (field in ('entry_url','organiser_url','organiser','organiser_club_id')),
  value jsonb not null,
  occurrence jsonb not null,
  observation_id uuid not null references public.source_research_observations(id),
  primary key(event_id,field)
);
create table public.event_review_conflicts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  field text not null,
  protected_value jsonb not null,
  attempted_value jsonb not null,
  observation_id uuid not null references public.source_research_observations(id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  attempts integer not null default 1,
  unique(event_id,field,observation_id,attempted_value)
);

-- Preserve reviewed fields across ALL import paths. Other imported columns
-- still update. Repeated conflicts update one counter rather than flooding.
create function public.protect_event_reviewed_fields() returns trigger
language plpgsql security definer set search_path=public as $$
declare g public.event_reviewed_fields; attempted jsonb;
begin
  for g in select * from public.event_reviewed_fields where event_id=old.id order by field loop
    -- An importer must not roll the date under an entry URL verified for the
    -- previous occurrence. Keep the row intact and record that conflict.
    attempted := jsonb_build_object('date_from',new.date_from,'date_to',to_jsonb(new)->'date_to','sort_date',new.sort_date);
    if attempted is distinct from g.occurrence then
      insert into public.event_review_conflicts(event_id,field,protected_value,attempted_value,observation_id)
      values(old.id,'occurrence_dates',g.occurrence,attempted,g.observation_id)
      on conflict(event_id,field,observation_id,attempted_value) do update
      set last_seen_at=now(),attempts=event_review_conflicts.attempts+1;
      return old;
    end if;
    attempted := to_jsonb(new)->g.field;
    if attempted is distinct from g.value then
      insert into public.event_review_conflicts(event_id,field,protected_value,attempted_value,observation_id)
      values(old.id,g.field,g.value,attempted,g.observation_id)
      on conflict(event_id,field,observation_id,attempted_value) do update
      set last_seen_at=now(),attempts=event_review_conflicts.attempts+1;
      new := jsonb_populate_record(new,jsonb_build_object(g.field,g.value));
    end if;
  end loop;
  return new;
end $$;
-- Run late among existing BEFORE triggers.
create trigger zz_protect_event_reviewed_fields before update on public.events
for each row execute function public.protect_event_reviewed_fields();

create function public.ingest_source_research(_observations jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare o jsonb; s public.research_sources; previous public.source_research_observations; n integer:=0;
begin
  if jsonb_typeof(_observations)<>'array' or jsonb_array_length(_observations) not between 1 and 50 then raise exception 'invalid_batch'; end if;
  for o in select value from jsonb_array_elements(_observations) loop
    select * into s from public.research_sources where id=(o->>'source_id')::uuid for share;
    if not found or not s.enabled then raise exception 'source_not_enabled'; end if;
    if o->'evidence'->>'source_url' is distinct from s.url then raise exception 'source_url_mismatch'; end if;
    if o->'evidence'->>'content_sha256' !~ '^[a-f0-9]{64}$'
      or length(coalesce(o->'evidence'->>'summary','')) not between 1 and 6000
      or (o->'evidence'->>'captured_at')::timestamptz > now()+interval '5 minutes'
      or o->'evidence'->>'final_url' !~ '^https?://' then raise exception 'invalid_evidence'; end if;
    insert into public.source_research_observations(id,source_id,run_id,evidence,proposal,conflicts)
    values((o->>'id')::uuid,s.id,(o->>'run_id')::uuid,o->'evidence',o->'proposal',o->'conflicts')
    on conflict(id) do nothing;
    if found then n:=n+1;
    else
      select * into previous from public.source_research_observations where id=(o->>'id')::uuid;
      if previous.source_id<>s.id or previous.run_id<>(o->>'run_id')::uuid
        or previous.evidence<>o->'evidence' or previous.proposal<>o->'proposal' or previous.conflicts<>o->'conflicts'
      then raise exception 'observation_id_reused_with_different_content'; end if;
    end if;
  end loop;
  return jsonb_build_object('received',jsonb_array_length(_observations),'inserted',n);
end $$;

create function public.review_source_research(_id uuid,_action text,_note text,_reviewer text)
returns jsonb language plpgsql security definer set search_path=public as $$
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
        if f not in ('entry_url','organiser_url') or not(p ? 'expected_value') then raise exception 'unsupported_field'; end if;
        if to_jsonb(e)->f is distinct from p->'expected_value' then raise exception 'stale_expected_value'; end if;
        if coalesce(p->>'proposed_value','') !~ '^https?://[^/@[:space:]]+([/?#]|$)' or length(p->>'proposed_value')>2000 then raise exception 'invalid_destination'; end if;
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
      entry_url=case when patch ? 'entry_url' then patch->>'entry_url' else entry_url end,
      organiser_url=case when patch ? 'organiser_url' then patch->>'organiser_url' else organiser_url end,
      organiser=case when patch ? 'organiser' then patch->>'organiser' else organiser end,
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
end $$;

create function public.approve_research_club_identity(_club_id uuid,_organisation_id uuid,_source_url text,_fact text,_reviewer text)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.clubs; org_id uuid; ev_id uuid; existing public.organisation_club_links;
begin
  if length(btrim(coalesce(_fact,'')))<10 or length(btrim(coalesce(_reviewer,'')))=0
    or coalesce(_source_url,'') !~ '^https?://[^/@[:space:]]+([/?#]|$)' then raise exception 'identity_evidence_required'; end if;
  select * into c from public.clubs where id=_club_id for update;
  if not found then raise exception 'club_not_found'; end if;
  if exists(select 1 from public.organisation_club_links where club_id=_club_id and review_status='accepted' and organisation_id is distinct from _organisation_id) then raise exception 'club_already_mapped'; end if;
  if _organisation_id is null then
    if exists(select 1 from public.organisations where lower(btrim(canonical_name))=lower(btrim(c.name))) then raise exception 'select_existing_organisation'; end if;
    insert into public.organisations(canonical_name,status) values(c.name,'approved') returning id into org_id;
  else
    perform 1 from public.organisations where id=_organisation_id and status<>'merged' for update;
    if not found then raise exception 'organisation_not_found_or_merged'; end if;
    org_id:=_organisation_id;
    if exists(select 1 from public.organisation_club_links where organisation_id=org_id and club_id<>_club_id and review_status='accepted') then raise exception 'organisation_already_mapped'; end if;
    update public.organisations set status='approved' where id=org_id;
  end if;
  insert into public.identity_evidence(source_url,evidence_type,supporting_fact) values(_source_url,'manual_observation',_fact)
  on conflict(fingerprint) do update set supporting_fact=excluded.supporting_fact returning id into ev_id;
  select * into existing from public.organisation_club_links where organisation_id=org_id and club_id=_club_id;
  if found then
    if existing.review_status='accepted' then return org_id; end if;
    raise exception 'existing_crosswalk_requires_review';
  end if;
  insert into public.organisation_club_links(organisation_id,club_id,evidence_id,review_status,reviewer_identity,reviewed_at)
  values(org_id,_club_id,ev_id,'accepted',_reviewer,now());
  return org_id;
end $$;

do $$ declare t text; begin
  foreach t in array array['research_sources','organisation_club_links','source_research_observations','source_research_reviews','event_reviewed_fields','event_review_conflicts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.protect_event_reviewed_fields() from public, anon, authenticated;
revoke all on function public.ingest_source_research(jsonb) from public, anon, authenticated;
revoke all on function public.review_source_research(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.ingest_source_research(jsonb) to service_role;
grant execute on function public.review_source_research(uuid,text,text,text) to service_role;
revoke all on function public.approve_research_club_identity(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.approve_research_club_identity(uuid,uuid,text,text,text) to service_role;
