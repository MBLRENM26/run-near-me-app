-- 1. Helper: upsert the IMPORT_SECRET value into vault.secrets.
--    Called once from a server function that reads process.env.IMPORT_SECRET.
create or replace function public.set_import_secret(p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'import_secret';
  if v_id is null then
    perform vault.create_secret(p_value, 'import_secret', 'Header value for x-admin-secret on /api/public/admin/sync-* routes');
  else
    perform vault.update_secret(v_id, p_value, 'import_secret', 'Header value for x-admin-secret on /api/public/admin/sync-* routes');
  end if;
end;
$$;

revoke all on function public.set_import_secret(text) from public, anon, authenticated;
grant execute on function public.set_import_secret(text) to service_role;

-- 2. Driver: loop chunks of EA pages until the feed is exhausted.
--    Each chunk is an HTTP call to the public sync route. The cron tick
--    blocks on http_collect_response (async := false) so each chunk runs
--    sequentially within the same cron invocation.
create or replace function public.run_england_athletics_chunked()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret    text;
  v_from      int := 1;
  v_chunk     int := 20;
  v_safety    int := 0;
  v_max_loops int := 20;          -- 20 * 20 = 400 pages, well above EA's ~120
  v_req_id    bigint;
  v_result    net.http_response_result;
  v_body      jsonb;
  v_done      boolean := false;
  v_chunks    int := 0;
  v_status    int;
  v_last_msg  text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'import_secret';
  if v_secret is null then
    raise exception 'import_secret not present in vault.secrets';
  end if;

  while not v_done and v_safety < v_max_loops loop
    v_safety := v_safety + 1;

    select net.http_post(
      url := 'https://project--fa471d0b-8fb1-4a40-afd4-c20d7685abc1.lovable.app/api/public/admin/sync-england-athletics?from='
             || v_from || '&to=' || (v_from + v_chunk - 1),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-admin-secret', v_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) into v_req_id;

    -- Block this cron tick until the chunk responds (or times out).
    select * into v_result from net.http_collect_response(v_req_id, async := false);

    v_status := (v_result.response).status_code;
    v_chunks := v_chunks + 1;

    if v_status is null or v_status <> 200 then
      v_last_msg := coalesce(v_result.message, 'no message');
      raise warning 'EA chunk from=% to=% failed: status=% message=%',
        v_from, v_from + v_chunk - 1, v_status, v_last_msg;
      exit;
    end if;

    begin
      v_body := (v_result.response).body::jsonb;
    exception when others then
      raise warning 'EA chunk from=% to=% returned non-JSON body', v_from, v_from + v_chunk - 1;
      exit;
    end;

    v_done := coalesce((v_body ->> 'done')::boolean, false);
    v_from := v_from + v_chunk;
  end loop;

  return jsonb_build_object(
    'chunks', v_chunks,
    'done', v_done,
    'last_from', v_from - v_chunk
  );
end;
$$;

revoke all on function public.run_england_athletics_chunked() from public, anon, authenticated;
grant execute on function public.run_england_athletics_chunked() to service_role;

-- 3. Reschedule both weekly cron jobs with the correct auth header.
--    - England Athletics: use the chunked driver (one cron tick, many chunks).
--    - Scottish Athletics: keep one-shot call but switch apikey -> x-admin-secret.
do $$
begin
  perform cron.unschedule('weekly-sync-england-athletics');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('weekly-sync-scottish-athletics');
exception when others then null;
end $$;

select cron.schedule(
  'weekly-sync-england-athletics',
  '15 3 * * 1',
  $$ select public.run_england_athletics_chunked(); $$
);

select cron.schedule(
  'weekly-sync-scottish-athletics',
  '0 3 * * 1',
  $$
  select net.http_post(
    url := 'https://project--fa471d0b-8fb1-4a40-afd4-c20d7685abc1.lovable.app/api/public/admin/sync-scottish-athletics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'import_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);