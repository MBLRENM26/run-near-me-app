CREATE TABLE IF NOT EXISTS public.admin_login_rate_hits (
  key_hash bytea PRIMARY KEY,
  bucket_start timestamptz NOT NULL DEFAULT now(),
  bucket_hits integer NOT NULL DEFAULT 0,
  day_start timestamptz NOT NULL DEFAULT now(),
  day_hits integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_login_rate_hits TO service_role;

ALTER TABLE public.admin_login_rate_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_login_rate(_key_hash text)
RETURNS TABLE(allowed boolean, retry_after_s integer, bucket_hits integer, day_hits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_key bytea;
  v_utc_now timestamptz := timezone('UTC', now());
  v_bucket_start timestamptz;
  v_day_start timestamptz;
  v_lock_key bigint;
  v_bucket_hits integer := 0;
  v_day_hits integer := 0;
  v_retry integer := 0;
BEGIN
  v_key := decode(replace(_key_hash, '\x', ''), 'hex');
  v_bucket_start := date_trunc('hour', v_utc_now)
    + interval '15 minutes' * (extract(minute from v_utc_now)::int / 15);
  v_day_start := date_trunc('day', v_utc_now);

  v_lock_key := ('x' || encode(substring(v_key from 1 for 8), 'hex'))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.admin_login_rate_hits (key_hash, bucket_start, bucket_hits, day_start, day_hits, last_hit_at)
  VALUES (v_key, v_bucket_start, 0, v_day_start, 0, now())
  ON CONFLICT (key_hash) DO UPDATE SET
    bucket_hits = CASE
      WHEN excluded.bucket_start > public.admin_login_rate_hits.bucket_start THEN 0
      ELSE public.admin_login_rate_hits.bucket_hits
    END,
    day_hits = CASE
      WHEN excluded.day_start > public.admin_login_rate_hits.day_start THEN 0
      ELSE public.admin_login_rate_hits.day_hits
    END,
    bucket_start = CASE
      WHEN excluded.bucket_start > public.admin_login_rate_hits.bucket_start THEN excluded.bucket_start
      ELSE public.admin_login_rate_hits.bucket_start
    END,
    day_start = CASE
      WHEN excluded.day_start > public.admin_login_rate_hits.day_start THEN excluded.day_start
      ELSE public.admin_login_rate_hits.day_start
    END,
    last_hit_at = now();

  SELECT bucket_hits, day_hits INTO v_bucket_hits, v_day_hits
  FROM public.admin_login_rate_hits
  WHERE key_hash = v_key
  FOR UPDATE;

  IF v_bucket_hits >= 5 OR v_day_hits >= 20 THEN
    IF v_day_hits >= 20 THEN
      v_retry := GREATEST(1, extract(epoch FROM (v_day_start + interval '1 day' - v_utc_now))::int);
    ELSE
      v_retry := GREATEST(1, extract(epoch FROM (v_bucket_start + interval '15 minutes' - v_utc_now))::int);
    END IF;
    RETURN QUERY SELECT false, v_retry, v_bucket_hits, v_day_hits;
    RETURN;
  END IF;

  UPDATE public.admin_login_rate_hits
  SET bucket_hits = bucket_hits + 1,
      day_hits = day_hits + 1,
      last_hit_at = now()
  WHERE key_hash = v_key
  RETURNING bucket_hits, day_hits INTO v_bucket_hits, v_day_hits;

  RETURN QUERY SELECT true, 0, v_bucket_hits, v_day_hits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_login_rate(text) TO service_role;