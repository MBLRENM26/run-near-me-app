
CREATE OR REPLACE FUNCTION public.consume_login_rate_global()
 RETURNS TABLE(allowed boolean, retry_after_s integer, bucket_hits integer, day_hits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Precomputed sha256('admin-login-global-v1'). Domain-separated sentinel
  -- distinct from any per-IP HMAC output. Encoded as a literal so the
  -- function has no runtime dependency on the pgcrypto extension.
  v_key bytea := '\x9fb7814e16e59b031ff6c296fad4afeebb5cd9ea9c7e59a63e85d5d6ba29a0c8'::bytea;
  v_utc_now timestamptz := timezone('UTC', now());
  v_bucket_start timestamptz;
  v_day_start timestamptz;
  v_lock_key bigint;
  v_bucket_hits integer := 0;
  v_day_hits integer := 0;
  v_retry integer := 0;
  c_bucket_cap constant integer := 60;
  c_day_cap    constant integer := 300;
BEGIN
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

  SELECT h.bucket_hits, h.day_hits INTO v_bucket_hits, v_day_hits
  FROM public.admin_login_rate_hits h
  WHERE h.key_hash = v_key
  FOR UPDATE;

  IF v_bucket_hits >= c_bucket_cap OR v_day_hits >= c_day_cap THEN
    IF v_day_hits >= c_day_cap THEN
      v_retry := GREATEST(1, extract(epoch FROM (v_day_start + interval '1 day' - v_utc_now))::int);
    ELSE
      v_retry := GREATEST(1, extract(epoch FROM (v_bucket_start + interval '15 minutes' - v_utc_now))::int);
    END IF;
    RETURN QUERY SELECT false, v_retry, v_bucket_hits, v_day_hits;
    RETURN;
  END IF;

  UPDATE public.admin_login_rate_hits h
  SET bucket_hits = h.bucket_hits + 1,
      day_hits = h.day_hits + 1,
      last_hit_at = now()
  WHERE h.key_hash = v_key
  RETURNING h.bucket_hits, h.day_hits INTO v_bucket_hits, v_day_hits;

  RETURN QUERY SELECT true, 0, v_bucket_hits, v_day_hits;
END;
$function$;
