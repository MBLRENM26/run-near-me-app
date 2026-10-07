-- Run only in the disposable source-research test database.
\set ON_ERROR_STOP on
begin;
insert into events(id,name,date_from,sort_date,distances) values ('22222222-2222-4222-8222-222222222223','Brodie Castle 10K 2025','2026-10-18','2026-10-18','10K');
insert into research_sources(id,label,url,role,page_type,policy_note,enabled) values ('55555555-5555-4555-8555-555555555556','Name fixture','https://name.example/race','organiser','race','Disposable fixture',true);
do $$ declare obs jsonb; oid uuid:=gen_random_uuid(); first_id uuid; refused boolean; begin
  obs:=jsonb_build_object('id',oid,'source_id','55555555-5555-4555-8555-555555555556','run_id',gen_random_uuid(),
    'evidence',jsonb_build_object('source_url','https://name.example/race','final_url','https://name.example/race','captured_at',now(),'content_sha256',repeat('b',64),'extractor','fixture','summary','Current registration confirms the race title.'),
    'proposal',jsonb_build_object('kind','event_change','event_id','22222222-2222-4222-8222-222222222223','expected_date','2026-10-18','field','name','expected_value','Brodie Castle 10K 2025','proposed_value','Brodie Castle 10K 2026'),'conflicts','[]'::jsonb);
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research(oid,'apply','Verified title','fixture reviewer');
  assert (select name='Brodie Castle 10K 2026' from events limit 1),'name review applies';
  assert (select field='name' from event_reviewed_fields limit 1),'existing protection owns name';
  update events set name='Brodie Castle 10K 2025',distances='Importer still updates other fields';
  assert (select name='Brodie Castle 10K 2026' and distances='Importer still updates other fields' from events limit 1),'stale imported year cannot overwrite reviewed title; unrelated update survives';
  update events set name='Brodie Castle 10K 2025';
  assert (select attempts=2 from event_review_conflicts where field='name'),'repeated conflict counted';
  refused:=false;
  begin perform update_admin_event_checked('22222222-2222-4222-8222-222222222223','{"name":"Wrong"}','Manual conflict'); exception when others then refused:=sqlerrm like 'Reviewed field%'; end;
  assert refused,'manual conflict fails explicitly';
  update events set date_from='2027-10-18',sort_date='2027-10-18',name='Brodie Castle 10K 2028';
  assert (select date_from='2026-10-18' from events limit 1),'new edition needs separate review';
  first_id:=oid; oid:=gen_random_uuid();
  obs:=jsonb_set(obs,'{id}',to_jsonb(oid));
  obs:=jsonb_set(obs,'{proposal,expected_value}',to_jsonb('Brodie Castle 10K 2026'::text));
  obs:=jsonb_set(obs,'{proposal,proposed_value}',to_jsonb('Forres Harriers Brodie Castle 10K 2026'::text));
  perform ingest_source_research(jsonb_build_array(obs));
  perform review_source_research(oid,'apply','Revised title','fixture reviewer');
  refused:=false;
  begin perform review_source_research(first_id,'revert','Old reversal','fixture reviewer'); exception when others then refused:=sqlerrm='stale_reversal'; end;
  assert refused,'old review cannot undo newer name';
  perform review_source_research(oid,'revert','Reverse newer','fixture reviewer');
  assert (select observation_id=first_id from event_reviewed_fields limit 1),'restore previous protection';
  perform review_source_research(first_id,'revert','Reverse first','fixture reviewer');
  assert (select name='Brodie Castle 10K 2025' from events limit 1),'restore original name';
  assert not exists(select 1 from event_reviewed_fields),'release protection';
  update events set name='Brodie Castle 10K 2028';
  assert (select name='Brodie Castle 10K 2028' from events limit 1),'ordinary import resumes after reversal';
  -- SQL rejects malformed text even when the application validator is bypassed.
  for obs in select jsonb_set(jsonb_set(jsonb_set(obs,'{id}',to_jsonb(gen_random_uuid())),'{proposal,expected_value}',to_jsonb('Brodie Castle 10K 2028'::text)),'{proposal,proposed_value}',v) from (values ('null'::jsonb),('4'::jsonb),('" "'::jsonb),(to_jsonb(repeat('x',301)))) invalid(v) loop
    perform ingest_source_research(jsonb_build_array(obs));
    refused:=false;
    begin perform review_source_research((obs->>'id')::uuid,'apply','Invalid value','fixture reviewer'); exception when others then refused:=sqlerrm='invalid_name'; end;
    assert refused,'invalid name refused';
  end loop;
  assert (select name='Brodie Castle 10K 2028' from events limit 1),'invalid attempts leave event intact';
  assert not has_function_privilege('authenticated','public.review_source_research(uuid,text,text,text)','EXECUTE'),'no expanded execution grants';
end $$;
rollback;
select 'Reviewed name transactional checks passed' as result;
