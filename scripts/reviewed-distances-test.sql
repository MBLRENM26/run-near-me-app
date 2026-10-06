-- Run only in the disposable source-research test database.
\set ON_ERROR_STOP on
begin;
insert into events(id,name,date_from,sort_date,distances) values ('22222222-2222-4222-8222-222222222223','Distance fixture','2027-02-07','2027-02-07','5K');
insert into research_sources(id,label,url,role,page_type,policy_note,enabled) values ('55555555-5555-4555-8555-555555555556','Distance fixture','https://distance.example/race','organiser','race','Disposable fixture',true);
do $$ declare obs jsonb; oid uuid:=gen_random_uuid(); first_id uuid; refused boolean; begin
  obs:=jsonb_build_object('id',oid,'source_id','55555555-5555-4555-8555-555555555556','run_id',gen_random_uuid(),
    'evidence',jsonb_build_object('source_url','https://distance.example/race','final_url','https://distance.example/race','captured_at',now(),'content_sha256',repeat('b',64),'extractor','fixture','summary','Current programme confirms age-group distances.'),
    'proposal',jsonb_build_object('kind','event_change','event_id','22222222-2222-4222-8222-222222222223','expected_date','2027-02-07','field','distances','expected_value','5K','proposed_value','U16: 2 km; U18: 3 km; senior: 4 km'),'conflicts','[]'::jsonb);
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research(oid,'apply','Verified programme','fixture reviewer');
  assert (select distances='U16: 2 km; U18: 3 km; senior: 4 km' from events limit 1),'distance review applies';
  assert (select field='distances' from event_reviewed_fields limit 1),'existing protection owns distance';
  update events set distances=null,name='Importer still updates other fields';
  assert (select distances='U16: 2 km; U18: 3 km; senior: 4 km' and name='Importer still updates other fields' from events limit 1),'import null cannot erase correction; unrelated update survives';
  update events set distances=null;
  assert (select attempts=2 from event_review_conflicts where field='distances'),'repeated conflict counted';
  refused:=false;
  begin perform update_admin_event_checked('22222222-2222-4222-8222-222222222223','{"distances":"Wrong"}','Manual conflict'); exception when others then refused:=sqlerrm like 'Reviewed field%'; end;
  assert refused,'manual conflict fails explicitly';
  update events set date_from='2028-02-07',sort_date='2028-02-07',distances='10K';
  assert (select date_from='2027-02-07' from events limit 1),'new edition needs separate review';
  first_id:=oid; oid:=gen_random_uuid();
  obs:=jsonb_set(obs,'{id}',to_jsonb(oid));
  obs:=jsonb_set(obs,'{proposal,expected_value}',to_jsonb('U16: 2 km; U18: 3 km; senior: 4 km'::text));
  obs:=jsonb_set(obs,'{proposal,proposed_value}',to_jsonb('4 km'::text));
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research(oid,'apply','Revised programme','fixture reviewer');
  refused:=false;
  begin perform review_source_research(first_id,'revert','Old reversal','fixture reviewer'); exception when others then refused:=sqlerrm='stale_reversal'; end;
  assert refused,'old review cannot undo newer distance';
  perform review_source_research(oid,'revert','Reverse newer','fixture reviewer');
  assert (select observation_id=first_id from event_reviewed_fields limit 1),'restore previous protection';
  perform review_source_research(first_id,'revert','Reverse first','fixture reviewer');
  assert (select distances='5K' from events limit 1),'restore original distance';
  assert not exists(select 1 from event_reviewed_fields),'release protection';
  update events set distances='10K';
  assert (select distances='10K' from events limit 1),'ordinary import resumes after reversal';
  -- SQL rejects malformed text even when the application validator is bypassed.
  for obs in select jsonb_set(jsonb_set(jsonb_set(obs,'{id}',to_jsonb(gen_random_uuid())),'{proposal,expected_value}',to_jsonb('10K'::text)),'{proposal,proposed_value}',v) from (values ('null'::jsonb),('4'::jsonb),('" "'::jsonb),(to_jsonb(repeat('x',501)))) invalid(v) loop
    perform ingest_source_research(jsonb_build_array(obs));
    refused:=false;
    begin perform review_source_research((obs->>'id')::uuid,'apply','Invalid value','fixture reviewer'); exception when others then refused:=sqlerrm='invalid_distances'; end;
    assert refused,'invalid distance refused';
  end loop;
  assert (select distances='10K' from events limit 1),'invalid attempts leave event intact';
  assert not has_function_privilege('authenticated','public.review_source_research(uuid,text,text,text)','EXECUTE'),'no expanded execution grants';
end $$;
rollback;
select 'Reviewed distance transactional checks passed' as result;
