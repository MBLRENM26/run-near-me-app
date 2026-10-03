-- Run after geography-test-bootstrap.sql and the geography migration.
\set ON_ERROR_STOP on
DO $$ BEGIN
ASSERT (SELECT array_agg(slug ORDER BY slug) FROM search_events_v1('Fixture',50))=ARRAY['gb_alias','lowercase','ni','parkrun','uk_correct','uk_missing','unknown_missing','unknown_uk'], 'keyword geography or date regression';
ASSERT (SELECT array_agg(slug ORDER BY slug) FROM events_within_radius(51.5,-0.1,600,500))=ARRAY['gb_alias','lowercase','ni','parkrun','uk_correct','unknown_uk'], 'radius geography or date regression';
ASSERT (SELECT count(*) FROM search_events_v1('Fixture',2))=2,'search cap regression';
ASSERT (SELECT count(*) FROM events_within_radius(51.5,-0.1,600,2))=2,'radius cap regression';
ASSERT NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('search_events_v1','events_within_radius') AND prosecdef), 'must remain security invoker';
END $$;
SELECT 'geography SQL fixtures passed' AS result;
