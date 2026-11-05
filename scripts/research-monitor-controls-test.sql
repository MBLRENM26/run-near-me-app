-- Disposable empty PostgreSQL 16 database only. No production evidence.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.research_sources(id uuid PRIMARY KEY,url text,enabled boolean,interval_hours integer);
CREATE TABLE public.research_review_queue(id uuid PRIMARY KEY,source_id uuid,status text,proposal jsonb,review_note text);
INSERT INTO research_sources VALUES ('11111111-1111-4111-8111-111111111111','https://example.org/race',true,168);
INSERT INTO research_review_queue
SELECT md5('parent-'||g)::uuid,'11111111-1111-4111-8111-111111111111'::uuid,
  CASE WHEN g > 37 THEN 'held' ELSE 'pending' END,
  CASE WHEN g > 43 THEN '{"kind":"new_occurrence"}'::jsonb ELSE '{"kind":"page_change"}'::jsonb END,
  CASE WHEN g <= 18 THEN jsonb_build_object('decision','relationship_accepted',
    'derived_observation_id',md5('derived-'||g)::uuid,'event_id','event','club_id','club','organisation_id','org')::text ELSE NULL END
FROM generate_series(1,45) g;
INSERT INTO research_review_queue
SELECT md5('derived-'||g)::uuid,'11111111-1111-4111-8111-111111111111'::uuid,'applied',
  '{"kind":"club_relationship","event_id":"event","club_id":"club","organisation_id":"org"}'::jsonb,
  'Supporting evidence '||(md5('parent-'||g)::uuid)::text FROM generate_series(1,18) g;
\ir ../drizzle/migrations/0004_research_monitor_controls.sql
DO $$ DECLARE r jsonb; BEGIN
 r:=research_monitor_controls(ARRAY['11111111-1111-4111-8111-111111111111'::uuid]);
 IF r->>'pending_review' <> '45' OR r#>>'{review_workload,verified_completed_support}' <> '18'
 OR r#>>'{review_workload,actionable_review}' <> '27' THEN RAISE EXCEPTION 'Classification failed: %',r; END IF;
END $$;
SAVEPOINT baseline;
UPDATE research_review_queue SET status='reverted' WHERE id=md5('derived-1')::uuid;
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,verified_completed_support}' <> '17' THEN RAISE EXCEPTION 'Reverted decision excluded'; END IF; END $$;
ROLLBACK TO baseline;
UPDATE research_review_queue SET review_note='malformed' WHERE status='pending';
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,actionable_review}' <> '45' THEN RAISE EXCEPTION 'Malformed notes excluded'; END IF; END $$;
ROLLBACK TO baseline;
UPDATE research_review_queue SET review_note=NULL WHERE status='applied';
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,actionable_review}' <> '45' THEN RAISE EXCEPTION 'Missing reciprocal evidence excluded'; END IF; END $$;
ROLLBACK TO baseline;
UPDATE research_review_queue SET proposal=proposal||'{"club_id":"wrong"}'::jsonb WHERE status='applied';
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,actionable_review}' <> '45' THEN RAISE EXCEPTION 'Wrong identity excluded'; END IF; END $$;
ROLLBACK TO baseline;
UPDATE research_review_queue SET status='held' WHERE status='pending';
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,actionable_review}' <> '45' THEN RAISE EXCEPTION 'Held evidence excluded'; END IF; END $$;
ROLLBACK TO baseline;
UPDATE research_review_queue SET proposal=proposal||'{"extraction":{}}'::jsonb WHERE status='pending';
DO $$ BEGIN IF research_monitor_controls(NULL)#>>'{review_workload,actionable_review}' <> '45' THEN RAISE EXCEPTION 'Structured research excluded'; END IF; END $$;
ROLLBACK TO baseline;
INSERT INTO research_sources SELECT md5('source-'||g)::uuid,'https://example.org/'||g,false,168 FROM generate_series(1,1062) g;
DO $$ BEGIN
 BEGIN PERFORM research_monitor_controls(NULL); RAISE EXCEPTION 'Expected completeness error';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Source controls incomplete or oversized' THEN RAISE; END IF; END;
 IF jsonb_array_length(research_monitor_controls(ARRAY['11111111-1111-4111-8111-111111111111'::uuid])->'sources') <> 1 THEN RAISE EXCEPTION 'Scoped controls incomplete'; END IF;
 IF has_function_privilege('anon','research_monitor_controls(uuid[])','EXECUTE') OR has_function_privilege('authenticated','research_monitor_controls(uuid[])','EXECUTE') THEN RAISE EXCEPTION 'Public access'; END IF;
 IF NOT has_function_privilege('service_role','research_monitor_controls(uuid[])','EXECUTE') THEN RAISE EXCEPTION 'Missing service access'; END IF;
END $$;
ROLLBACK;
