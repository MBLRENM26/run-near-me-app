-- lovable-cron-fallback-reviewed: tick is scheduled only during the weekly EA sync (~10 runs/week) and unschedules itself when the chunk chain finishes
GRANT EXECUTE ON FUNCTION public.set_import_secret(text) TO service_role;

CREATE TABLE public.ea_sync_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  next_from int,
  req_id bigint,
  sent_at timestamptz,
  chunks int NOT NULL DEFAULT 0,
  last_status int,
  last_error text,
  finished_at timestamptz
);
GRANT ALL ON public.ea_sync_state TO service_role;
ALTER TABLE public.ea_sync_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.ea_sync_state (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.ea_sync_post_chunk(p_from int)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_secret text; v_req bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'import_secret';
  SELECT net.http_post(
    url := 'https://project--fa471d0b-8fb1-4a40-afd4-c20d7685abc1.lovable.app/api/public/admin/sync-england-athletics?from='
           || p_from || '&to=' || (p_from + 19),
    headers := jsonb_build_object('Content-Type','application/json','x-admin-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) INTO v_req;
  UPDATE public.ea_sync_state SET next_from = p_from, req_id = v_req, sent_at = now(), chunks = chunks + 1 WHERE id = 1;
  RETURN v_req;
END $$;

CREATE OR REPLACE FUNCTION public.ea_sync_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.ea_sync_state; r record; v_done boolean;
BEGIN
  SELECT * INTO s FROM public.ea_sync_state WHERE id = 1 FOR UPDATE;
  IF s.req_id IS NULL THEN
    BEGIN PERFORM cron.unschedule('ea-sync-tick'); EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN;
  END IF;
  SELECT status_code, content, error_msg, timed_out INTO r FROM net._http_response WHERE id = s.req_id;
  IF NOT FOUND THEN
    IF s.sent_at < now() - interval '10 minutes' THEN
      UPDATE public.ea_sync_state SET req_id = NULL, last_error = 'no response after 10 min', finished_at = now() WHERE id = 1;
    END IF;
    RETURN;
  END IF;
  IF r.status_code IS DISTINCT FROM 200 THEN
    UPDATE public.ea_sync_state SET req_id = NULL, last_status = r.status_code,
      last_error = left(coalesce(r.error_msg, r.content, 'timed out'), 500), finished_at = now() WHERE id = 1;
    RETURN;
  END IF;
  BEGIN v_done := coalesce((r.content::jsonb ->> 'done')::boolean, false);
  EXCEPTION WHEN OTHERS THEN v_done := true; END;
  IF v_done OR s.chunks >= 20 THEN
    UPDATE public.ea_sync_state SET req_id = NULL, last_status = 200, last_error = NULL, finished_at = now() WHERE id = 1;
  ELSE
    UPDATE public.ea_sync_state SET last_status = 200 WHERE id = 1;
    PERFORM public.ea_sync_post_chunk(s.next_from + 20);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.run_england_athletics_chunked()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.ea_sync_state SET chunks = 0, last_status = NULL, last_error = NULL, finished_at = NULL WHERE id = 1;
  PERFORM public.ea_sync_post_chunk(1);
  BEGIN PERFORM cron.schedule('ea-sync-tick', '* * * * *', 'SELECT public.ea_sync_tick();');
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'ea-sync-tick schedule failed: %', SQLERRM; END;
  RETURN jsonb_build_object('started', true);
END $$;

CREATE OR REPLACE FUNCTION public.cron_health_24h()
RETURNS TABLE(kind text, name text, detail text, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 'cron_failed', j.jobname, left(d.return_message, 300), d.start_time
  FROM cron.job_run_details d JOIN cron.job j USING (jobid)
  WHERE d.start_time > now() - interval '24 hours' AND d.status = 'failed'
  UNION ALL
  SELECT 'http_error', coalesce(r.status_code::text, 'no status'), left(coalesce(r.error_msg, r.content), 300), r.created
  FROM net._http_response r
  WHERE r.created > now() - interval '24 hours' AND (r.status_code IS NULL OR r.status_code <> 200)
  UNION ALL
  SELECT 'ea_sync_error', 'weekly-sync-england-athletics', s.last_error, s.finished_at
  FROM public.ea_sync_state s WHERE s.last_error IS NOT NULL AND s.finished_at > now() - interval '24 hours';
$$;
REVOKE ALL ON FUNCTION public.cron_health_24h() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_health_24h() TO service_role;
REVOKE ALL ON FUNCTION public.ea_sync_tick(), public.ea_sync_post_chunk(int), public.run_england_athletics_chunked() FROM PUBLIC, anon, authenticated;