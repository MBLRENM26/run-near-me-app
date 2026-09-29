\set ON_ERROR_STOP on
begin;
insert into clubs values('11111111-1111-4111-8111-111111111111','Fixture Running Club');
insert into events(id,name,sort_date,date_from) values('22222222-2222-4222-8222-222222222222','Fixture Race','2027-02-07','2027-02-07');
insert into organisations(id,canonical_name,status) values('33333333-3333-4333-8333-333333333333','Fixture Running Club','approved');
insert into identity_evidence(id,source_url,evidence_type,supporting_fact) values('44444444-4444-4444-8444-444444444444','https://club.example/race','manual_observation','The club identifies itself on its official page.');
insert into organisation_club_links(organisation_id,club_id,evidence_id,review_status,reviewer_identity,reviewed_at)
values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','accepted','test',now());
insert into research_sources(id,label,url,role,page_type,club_id,policy_note,enabled) values('55555555-5555-4555-8555-555555555555','Fixture source','https://club.example/race','club','race','11111111-1111-4111-8111-111111111111','Test only',true);

do $$ declare obs jsonb; result jsonb; rejected boolean; before_count int; begin
  assert not has_table_privilege('anon','public.source_research_observations','SELECT'),'private evidence not anonymously readable';
  assert not has_function_privilege('authenticated','public.review_source_research(uuid,text,text,text)','EXECUTE'),'ordinary sessions cannot accept';
  declare created_org uuid; begin
    insert into clubs values('99999999-9999-4999-8999-999999999999','Second Fixture Club');
    created_org:=approve_research_club_identity('99999999-9999-4999-8999-999999999999',null,'https://second.example/about','Official club identity was checked against this page.','test');
    assert (select status='approved' from organisations where id=created_org),'identity approval creates organisation';
    assert approve_research_club_identity('99999999-9999-4999-8999-999999999999',created_org,'https://second.example/about','Official club identity was checked against this page.','test')=created_org,'identity mapping retry';
    rejected:=false;
    begin perform approve_research_club_identity('11111111-1111-4111-8111-111111111111',created_org,'https://second.example/about','Conflicting club identity should be refused.','test'); exception when others then rejected:=true; end;
    assert rejected,'competing identity mapping refused';
  end;
  obs:=jsonb_build_object('id','66666666-6666-4666-8666-666666666666','source_id','55555555-5555-4555-8555-555555555555','run_id',gen_random_uuid(),
    'evidence',jsonb_build_object('source_url','https://club.example/race','final_url','https://club.example/race','captured_at',now(),'content_sha256',repeat('a',64),'extractor','fixture-v1','summary','Club race with verified current entry destination.'),
    'proposal',jsonb_build_object('kind','event_change','event_id','22222222-2222-4222-8222-222222222222','expected_date','2027-02-07','field','entry_url','expected_value',null,'proposed_value','https://entries.example/race'),'conflicts','[]'::jsonb);
  result:=ingest_source_research(jsonb_build_array(obs));
  assert result->>'inserted'='1','first intake';
  result:=ingest_source_research(jsonb_build_array(obs));
  assert result->>'inserted'='0','idempotent intake';
  rejected:=false;
  begin perform ingest_source_research(jsonb_build_array(jsonb_set(obs,'{evidence,summary}','"Different content"'))); exception when others then rejected:=true; end;
  assert rejected,'same ID with changed content must fail';
  perform review_source_research((obs->>'id')::uuid,'apply','Verified source and occurrence','test');
  assert (select entry_url='https://entries.example/race' from events limit 1),'destination applied';
  select count(*) into before_count from event_edits;
  perform review_source_research((obs->>'id')::uuid,'apply','Retry','test');
  assert (select count(*)=before_count from event_edits),'apply retry has no duplicate audit';
  update events set entry_url='https://old-import.example/race';
  assert (select entry_url='https://entries.example/race' from events limit 1),'import cannot overwrite reviewed URL';
  assert (select count(*)=1 from event_review_conflicts),'import conflict captured';
  update events set entry_url='https://old-import.example/race';
  assert (select attempts=2 from event_review_conflicts limit 1),'repeat import conflict counted';
  update events set sort_date='2028-02-07',date_from='2028-02-07',entry_url='https://future.example/race';
  assert (select sort_date='2027-02-07' and date_from='2027-02-07' and entry_url='https://entries.example/race' from events limit 1),'edition rollover cannot retain a stale reviewed entry';
  assert (select count(*)=1 from event_review_conflicts where field='occurrence_dates'),'edition rollover conflict captured';
  perform review_source_research((obs->>'id')::uuid,'revert','Reversal test','test');
  assert (select entry_url is null from events limit 1),'reversal restores original null';
  assert (select count(*)=0 from event_reviewed_fields),'reversal releases prior unprotected field';

  -- Stale expected value, date, conflicts and unsupported kinds are atomic.
  obs:=jsonb_set(obs,'{id}','"77777777-7777-4777-8777-777777777777"');
  obs:=jsonb_set(obs,'{proposal,expected_value}','"https://incorrect.example"');
  perform ingest_source_research(jsonb_build_array(obs));
  select count(*) into before_count from event_edits;
  rejected:=false;
  begin perform review_source_research((obs->>'id')::uuid,'apply','Stale test','test'); exception when others then rejected:=true; end;
  assert rejected,'stale expected value';
  assert (select count(*)=before_count from event_edits),'failed apply has no audit';
  assert (select count(*)=0 from event_reviewed_fields),'failed apply has no lock';

  -- A later review owns the lock. Reversing the older review must fail; reverse
  -- the newer one first to recover the earlier protected value and its owner.
  obs:=jsonb_set(obs,'{id}',to_jsonb(gen_random_uuid()));
  obs:=jsonb_set(obs,'{proposal,expected_value}','null');
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research((obs->>'id')::uuid,'apply','First correction','test');
  declare first_id uuid:=(obs->>'id')::uuid; second_id uuid; begin
    obs:=jsonb_set(obs,'{id}',to_jsonb(gen_random_uuid())); second_id:=(obs->>'id')::uuid;
    obs:=jsonb_set(obs,'{proposal,expected_value}','"https://entries.example/race"');
    obs:=jsonb_set(obs,'{proposal,proposed_value}','"https://entries.example/current"');
    perform ingest_source_research(jsonb_build_array(obs));
    perform review_source_research(second_id,'apply','Updated reviewed destination','test');
    rejected:=false;
    begin perform review_source_research(first_id,'revert','Older reversal must fail','test'); exception when others then rejected:=true; end;
    assert rejected,'older review cannot undo a newer one';
    perform review_source_research(second_id,'revert','Reverse newer correction','test');
    assert (select observation_id=first_id from event_reviewed_fields limit 1),'prior protection owner restored';
    perform review_source_research(first_id,'revert','Reverse original correction','test');
  end;

  obs:=jsonb_set(obs,'{id}','"88888888-8888-4888-8888-888888888888"');
  obs:=jsonb_set(obs,'{proposal}',jsonb_build_object('kind','club_relationship','event_id','22222222-2222-4222-8222-222222222222','expected_date','2027-02-07','organisation_id','33333333-3333-4333-8333-333333333333','club_id','11111111-1111-4111-8111-111111111111','expected_organiser',null,'expected_club_id',null));
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research((obs->>'id')::uuid,'apply','Club and organisation identity verified','test');
  assert (select organiser='Fixture Running Club' and organiser_club_id='11111111-1111-4111-8111-111111111111' from events limit 1),'club and organiser project together';
  assert (select count(*)=1 from organisation_event_links where review_status='accepted'),'ORL relationship accepted';
  update events set organiser=null,organiser_club_id=null;
  assert (select organiser_club_id is not null from events limit 1),'club relationship survives import';
  perform review_source_research((obs->>'id')::uuid,'revert','Reverse club projection','test');
  assert (select organiser is null and organiser_club_id is null from events limit 1),'club reversal restores fields';
  assert (select count(*)=1 from organisation_event_links where review_status='reopened'),'ORL review reopened on reversal';

  obs:=jsonb_set(obs,'{id}',to_jsonb(gen_random_uuid()));
  obs:=jsonb_set(obs,'{proposal}',jsonb_build_object('kind','new_occurrence','name','Mixed year race','date','2027-07-18','location','Town','schedule',null,'entry_url',null));
  obs:=jsonb_set(obs,'{conflicts}','["2027 header and 2026 body"]');
  perform ingest_source_research(jsonb_build_array(obs));
  rejected:=false;
  begin perform review_source_research((obs->>'id')::uuid,'apply','Must stay a discovery','test'); exception when others then rejected:=true; end;
  assert rejected,'new occurrence never silently published';
  perform review_source_research((obs->>'id')::uuid,'hold','Resolve conflicting editions','test');
  assert (select status='held' from source_research_observations where id=(obs->>'id')::uuid),'discovery held';
  assert (select count(*)=1 from events),'no new event created by research';
end $$;
rollback;
select 'Source research transactional checks passed' as result;
