
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'submission_rate_limiter_owner') THEN
    CREATE ROLE submission_rate_limiter_owner NOLOGIN;
  END IF;
END $$;

GRANT submission_rate_limiter_owner TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO submission_rate_limiter_owner;

CREATE TABLE public.submission_rate_hits (
  key_hash     bytea       NOT NULL,
  bucket_kind  text        NOT NULL CHECK (bucket_kind IN ('hour','day')),
  bucket_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_hash, bucket_kind, bucket_start)
);

CREATE INDEX submission_rate_hits_bucket_start_idx
  ON public.submission_rate_hits (bucket_start);

GRANT ALL ON public.submission_rate_hits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_rate_hits
  TO submission_rate_limiter_owner;

ALTER TABLE public.submission_rate_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_submission_rate(_key_hash bytea)
RETURNS TABLE(allowed boolean, retry_after_s integer, hour_hits integer, day_hits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_hour_start timestamptz := date_trunc('hour', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_day_start  timestamptz := date_trunc('day',  now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_next_hour  timestamptz := v_hour_start + interval '1 hour';
  v_next_day   timestamptz := v_day_start  + interval '1 day';
  v_lock_key   bigint;
  v_hour_hits  integer := 0;
  v_day_hits   integer := 0;
  v_hour_cap   boolean;
  v_day_cap    boolean;
  v_retry      integer := 0;
BEGIN
  v_lock_key := ('x' || encode(substring(_key_hash FROM 1 FOR 8), 'hex'))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.submission_rate_hits (key_hash, bucket_kind, bucket_start, hits)
    VALUES (_key_hash, 'hour', v_hour_start, 0)
    ON CONFLICT (key_hash, bucket_kind, bucket_start) DO NOTHING;
  INSERT INTO public.submission_rate_hits (key_hash, bucket_kind, bucket_start, hits)
    VALUES (_key_hash, 'day',  v_day_start,  0)
    ON CONFLICT (key_hash, bucket_kind, bucket_start) DO NOTHING;

  SELECT h.hits INTO v_hour_hits
    FROM public.submission_rate_hits h
    WHERE h.key_hash = _key_hash
      AND h.bucket_kind = 'hour'
      AND h.bucket_start = v_hour_start
    FOR UPDATE;

  SELECT h.hits INTO v_day_hits
    FROM public.submission_rate_hits h
    WHERE h.key_hash = _key_hash
      AND h.bucket_kind = 'day'
      AND h.bucket_start = v_day_start
    FOR UPDATE;

  v_hour_cap := v_hour_hits >= 10;
  v_day_cap  := v_day_hits  >= 30;

  IF v_hour_cap OR v_day_cap THEN
    IF v_day_cap THEN
      v_retry := extract(epoch FROM (v_next_day  - now()))::int;
    ELSE
      v_retry := extract(epoch FROM (v_next_hour - now()))::int;
    END IF;
    RETURN QUERY SELECT false, GREATEST(v_retry, 1), v_hour_hits, v_day_hits;
    RETURN;
  END IF;

  UPDATE public.submission_rate_hits
     SET hits = hits + 1, updated_at = now()
   WHERE key_hash = _key_hash
     AND bucket_kind = 'hour'
     AND bucket_start = v_hour_start
   RETURNING hits INTO v_hour_hits;

  UPDATE public.submission_rate_hits
     SET hits = hits + 1, updated_at = now()
   WHERE key_hash = _key_hash
     AND bucket_kind = 'day'
     AND bucket_start = v_day_start
   RETURNING hits INTO v_day_hits;

  RETURN QUERY SELECT true, 0, v_hour_hits, v_day_hits;
END;
$fn$;

ALTER FUNCTION public.consume_submission_rate(bytea)
  OWNER TO submission_rate_limiter_owner;

REVOKE ALL ON FUNCTION public.consume_submission_rate(bytea) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_submission_rate(bytea) FROM anon;
REVOKE ALL ON FUNCTION public.consume_submission_rate(bytea) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_submission_rate(bytea) TO service_role;

SELECT cron.alter_job(
  job_id  := (SELECT jobid FROM cron.job WHERE jobname = 'purge-spam-submissions-daily'),
  command := $cron$
    DELETE FROM public.submissions
     WHERE status = 'spam'
       AND submitted_at < now() - interval '30 days';
    DELETE FROM public.submission_rate_hits
     WHERE bucket_start < now() - interval '48 hours';
  $cron$
);
