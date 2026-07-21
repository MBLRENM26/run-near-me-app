-- Global (site-wide) login-attempt gate.
-- Same table + shape as the per-IP consume_login_rate, but keyed off a fixed
-- domain-separated sentinel so every login attempt without a per-IP identity
-- (and every attempt with one, as a second gate) shares one bucket.
--
-- Caps: 60 attempts / 15-minute UTC bucket, 300 / UTC day. These are site-wide
-- availability limits; comments in the calling code explain the trade-offs.

CREATE OR REPLACE FUNCTION public.consume_login_rate_global()
 RETURNS TABLE(allowed boolean, retry_after_s integer, bucket_hits integer, day_hits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Domain-separated sentinel: sha256('admin-login-global-v1').
  -- Distinct from any HMAC(secret, ip) output, so it cannot collide with a
  -- per-IP bucket even if an attacker somehow controlled the derivation.
  v_key bytea := digest('admin-login-global-v1', 'sha256');
  v_utc_now timestamptz := timezone('UTC', now());
  v_bucket_start timestamptz;
  v_day_start timestamptz;
  v_lock_key bigint;
  v_bucket_hits integer := 0;
  v_day_hits integer := 0;
  v_retry integer := 0;
  -- Site-wide caps. See src/lib/admin-login-rate-limit.server.ts for rationale.
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

  UPDATE public.admin_login_rate_hits
  SET bucket_hits = bucket_hits + 1,
      day_hits = day_hits + 1,
      last_hit_at = now()
  WHERE key_hash = v_key
  RETURNING bucket_hits, day_hits INTO v_bucket_hits, v_day_hits;

  RETURN QUERY SELECT true, 0, v_bucket_hits, v_day_hits;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_login_rate_global() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_rate_global() TO service_role;