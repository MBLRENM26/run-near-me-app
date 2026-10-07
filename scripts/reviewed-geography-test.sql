\set ON_ERROR_STOP on
BEGIN;
INSERT INTO events(id,name,date_from,sort_date,lat,lng,organiser,location_raw)
VALUES ('22222222-2222-4222-8222-222222222223','Venue fixture','2026-10-17','2026-10-17',51,-1,NULL,NULL);
INSERT INTO research_sources(id,label,url,role,page_type,policy_note,enabled)
VALUES ('55555555-5555-4555-8555-555555555556','Venue fixture','https://venue.example/race','organiser','race','Disposable fixture',true);
DO $$ DECLARE obs jsonb; oid uuid; item record; lat_id uuid; snap jsonb; refused boolean; BEGIN
 FOR item IN SELECT * FROM (VALUES ('lat','51'::jsonb,'55.823776'::jsonb),('lng','-1'::jsonb,'-4.303952'::jsonb),('organiser','null'::jsonb,'"Verified club"'::jsonb),('location_raw','null'::jsonb,'"Verified venue G43 1AT"'::jsonb)) fields(field,old_value,new_value) LOOP
  oid:=gen_random_uuid(); IF item.field='lat' THEN lat_id:=oid; END IF;
  obs:=jsonb_build_object('id',oid,'source_id','55555555-5555-4555-8555-555555555556','run_id',gen_random_uuid(),
   'evidence',jsonb_build_object('source_url','https://venue.example/race','final_url','https://venue.example/race','captured_at',now(),'content_sha256',repeat('b',64),'extractor','fixture','summary','Current organiser venue statement.'),
   'proposal',jsonb_build_object('kind','event_change','event_id','22222222-2222-4222-8222-222222222223','expected_date','2026-10-17','field',item.field,'expected_value',item.old_value,'proposed_value',item.new_value),'conflicts','[]'::jsonb);
  PERFORM ingest_source_research(jsonb_build_array(obs));
  PERFORM review_source_research(oid,'apply','Verified venue facts','fixture reviewer');
 END LOOP;
 snap:=get_sync_review_snapshot(); ASSERT (snap->>'violation_count')::int=0,'reviewed values pass initial audit';
 UPDATE events SET lat=51,lng=-1,organiser=NULL,location_raw=NULL,name='Legitimate source refresh';
 ASSERT (SELECT lat=55.823776 AND lng=-4.303952 AND organiser='Verified club' AND location_raw='Verified venue G43 1AT' AND name='Legitimate source refresh' FROM events LIMIT 1),'only reviewed fields held; ordinary updates survive';
 snap:=get_sync_review_snapshot(); ASSERT (snap->>'violation_count')::int=0 AND (snap->>'conflict_attempts')::int=4,'blocked changes visible without regression';
 UPDATE events SET date_from='2027-10-17',sort_date='2027-10-17';
 ASSERT (SELECT date_from='2026-10-17' FROM events LIMIT 1),'edition rollover held for review';
 PERFORM review_source_research(lat_id,'revert','Release reviewed latitude','fixture reviewer');
 ASSERT (get_sync_review_snapshot()->>'violation_count')::int=0,'audited reversal is not reported as missing protection';
 UPDATE events SET lat=52;
 ASSERT (SELECT lat=52 FROM events LIMIT 1),'released field accepts updates';
 -- Simulate a broken guard only inside this disposable transaction.
 ALTER TABLE events DISABLE TRIGGER zz_protect_event_reviewed_fields;
 UPDATE events SET lng=0;
 ASSERT (get_sync_review_snapshot()->>'violation_count')::int=1,'actual overwritten correction is detected';
 ALTER TABLE events ENABLE TRIGGER zz_protect_event_reviewed_fields;
 DELETE FROM event_reviewed_fields WHERE field='organiser';
 ASSERT (get_sync_review_snapshot()->>'violation_count')::int=2,'lost protection is detected, not silently excluded';
 ASSERT NOT has_function_privilege('authenticated','get_sync_review_snapshot()','EXECUTE'),'audit restricted to service role';
END $$;
ROLLBACK;
BEGIN;
INSERT INTO events(id,name,date_from,sort_date) VALUES
 ('22222222-2222-4222-8222-222222222224','Canonical','2026-10-17','2026-10-17'),
 ('22222222-2222-4222-8222-222222222225','Alias','2026-10-17','2026-10-17'),
 ('22222222-2222-4222-8222-222222222226','Other active race','2026-10-17','2026-10-17');
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"DUPLICATE","duplicate_of":"22222222-2222-4222-8222-222222222224"}','Reviewed duplicate');
DO $$ BEGIN ASSERT (get_sync_review_snapshot()->>'violation_count')::int=0,'reviewed direct redirect passes'; END $$;
ALTER TABLE events DISABLE TRIGGER zy_protect_reviewed_event_lifecycle;
UPDATE events SET duplicate_of='22222222-2222-4222-8222-222222222226' WHERE id='22222222-2222-4222-8222-222222222225';
DO $$ BEGIN ASSERT (get_sync_review_snapshot()->>'violation_count')::int=1,'redirect to a different active race is still wrong'; END $$;
UPDATE events SET duplicate_of='22222222-2222-4222-8222-222222222224',status='ACTIVE' WHERE id='22222222-2222-4222-8222-222222222225';
DO $$ BEGIN ASSERT (get_sync_review_snapshot()->>'violation_count')::int=1,'reactivated reviewed duplicate detected'; END $$;
ALTER TABLE events ENABLE TRIGGER zy_protect_reviewed_event_lifecycle;
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"ACTIVE","duplicate_of":null}','Audited duplicate reversal');
-- status is already ACTIVE after simulated corruption; record explicit reviewed
-- reinstatement as a real admin would by restoring the prior decision first.
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"DUPLICATE","duplicate_of":"22222222-2222-4222-8222-222222222224"}','Restore reviewed baseline');
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"ACTIVE","duplicate_of":null}','Audited duplicate reversal');
DO $$ BEGIN ASSERT (get_sync_review_snapshot()->>'violation_count')::int=0,'deliberate reversal refreshes the expected lifecycle'; END $$;
ROLLBACK;
SELECT 'Reviewed geography and integrity checks passed' result;
