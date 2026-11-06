CREATE TABLE public.coverage_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 audit_day date NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 snapshot jsonb NOT NULL,
 calendars jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT ALL ON public.coverage_reports TO service_role;
REVOKE ALL ON public.coverage_reports FROM anon, authenticated;
ALTER TABLE public.coverage_reports ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.collect_coverage_report()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE today date := (now() AT TIME ZONE 'UTC')::date; current_findings jsonb; previous_findings jsonb; report jsonb; prior jsonb; rid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('renm-coverage-report-v1'));
 SELECT to_jsonb(r) INTO report FROM coverage_reports r WHERE audit_day=today;
 IF FOUND THEN RETURN report; END IF;
 WITH future AS (
  SELECT * FROM events WHERE status='ACTIVE' AND duplicate_of IS NULL AND sort_date>=today
 ), issues AS (
  SELECT 'pin:'||id::text AS key, 'missing_location' AS kind, name AS title, slug, sort_date::text AS detail FROM future WHERE lat IS NULL OR lng IS NULL
  UNION ALL SELECT 'bounds:'||id::text,'geography_review',name,slug,'Outside discovery area; not proof of invalid venue' FROM future WHERE lat IS NOT NULL AND lng IS NOT NULL AND NOT(lat BETWEEN 49.9 AND 60.9 AND lng BETWEEN -8.6 AND 1.8)
  UNION ALL SELECT 'unknown:'||id::text,'date_unknown',name,slug,'No stored occurrence date' FROM events WHERE status='ACTIVE' AND duplicate_of IS NULL AND sort_date IS NULL AND NOT is_recurring
  UNION ALL SELECT 'range:'||id::text,'series_or_date_range',name,slug,sort_date::text||' to '||date_to::text FROM events WHERE status='ACTIVE' AND duplicate_of IS NULL AND sort_date<today AND date_to>=today
  UNION ALL SELECT 'duplicate:'||md5(lower(name)||sort_date::text||lower(coalesce(town,''))), 'possible_duplicate', min(name), min(slug),string_agg(slug,', ' ORDER BY slug) FROM future GROUP BY lower(name),sort_date,lower(coalesce(town,'')) HAVING count(*)>1
  UNION ALL SELECT 'sync:'||s.source,'update_failed',s.source,NULL,left(coalesce(s.error_message,s.status),300) FROM (SELECT DISTINCT ON(source) * FROM sync_runs WHERE source IN('england-athletics','scottish-athletics') ORDER BY source,started_at DESC,id DESC) s WHERE s.status NOT IN('success')
  UNION ALL SELECT 'overdue:'||source,'update_overdue',source,NULL,'No run since expected Monday schedule' FROM (VALUES ('england-athletics',interval '3 hours 15 minutes'),('scottish-athletics',interval '5 hours 30 minutes')) AS schedule(source,offset_time) WHERE now()>date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'+offset_time+interval '6 hours' AND NOT EXISTS(SELECT 1 FROM sync_runs s WHERE s.source=schedule.source AND s.started_at>=date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'+offset_time)
  UNION ALL SELECT 'integrity:'||s.source,'review_conflicts',s.source,NULL,'Reviewed-field violations: '||coalesce(s.review_integrity->'after'->>'violation_count','unknown')||'; source conflict attempts: '||coalesce(s.review_integrity->>'conflict_attempts_added','0') FROM (SELECT DISTINCT ON(source) * FROM sync_runs WHERE source IN('england-athletics','scottish-athletics') ORDER BY source,started_at DESC,id DESC) s WHERE s.review_integrity->>'status'='review_required'
 ) SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY kind,key),'[]') INTO current_findings FROM issues i;
 SELECT snapshot INTO prior FROM coverage_reports ORDER BY audit_day DESC LIMIT 1;
 previous_findings:=coalesce(prior->'findings','[]');
 INSERT INTO coverage_reports(audit_day,snapshot) VALUES(today,jsonb_build_object('version',1,'checked_at',now(),'findings',current_findings,'new_keys',coalesce((SELECT jsonb_agg(f->>'key') FROM jsonb_array_elements(current_findings) f WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(previous_findings) p WHERE p->>'key'=f->>'key')),'[]'::jsonb),'resolved_keys',coalesce((SELECT jsonb_agg(p->>'key') FROM jsonb_array_elements(previous_findings) p WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(current_findings) f WHERE f->>'key'=p->>'key')),'[]'::jsonb))) RETURNING id INTO rid;
 SELECT to_jsonb(r) INTO report FROM coverage_reports r WHERE id=rid;
 RETURN report;
END $fn$;
REVOKE ALL ON FUNCTION public.collect_coverage_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collect_coverage_report() TO service_role;
COMMENT ON TABLE public.coverage_reports IS 'Private daily coverage exceptions and weekly calendar leads, not event facts or public projections. Four-week trial to 2026-12-04.';