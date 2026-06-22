# Fix EA sync — authed cron + self-terminating chunked runs

Two fixes, both small. Chunk size is fixed; **number of chunks is dynamic** — we stop as soon as EA's `meta.last_page` tells us we're done. Most weeks that'll be 3-4 chunks; busier parts of the year 6-7.

## 1. Cron auth — send `x-admin-secret` from vault

Confirmed root cause: both weekly `pg_cron` jobs 401 because they send only `apikey` (Supabase anon) where the routes require `x-admin-secret: $IMPORT_SECRET`. `net._http_response` shows `401 Unauthorized` for the last two Monday runs.

**Steps**

1. Store `IMPORT_SECRET` value in `vault.secrets` as `import_secret`. Same pattern the email-queue cron uses for `email_queue_service_role_key`.
2. `cron.unschedule` + `cron.schedule` both jobs (`weekly-sync-england-athletics`, `weekly-sync-scottish-athletics`) so headers include `x-admin-secret` from the decrypted vault secret. Drop the inert `apikey` header.
3. **EA cron also switches to the chunked driver below** (sync-scottish stays as one shot — it finishes in 4s).

No route changes.

## 2. Self-terminating chunked EA driver

The pattern: fetch a chunk of N pages (default **20**), look at `meta.last_page` returned by EA, decide whether another chunk is needed. Loop until done. Each chunk fits comfortably inside the worker response budget, so `run.finish(...)` always executes — no more dangling `running` rows.

### A. `src/lib/sync-england-athletics.server.ts`

- `EnglandAthleticsSyncResult` already includes `fetched`. Add **`lastPage: number`** and **`done: boolean`** — `done = toPage >= lastPage`.
- The function already tracks `lastPage` internally from the last successful `fetchPage`; just surface it. Trivial change.

### B. `src/routes/api/public/admin/sync-england-athletics.ts`

- No logic change — it already accepts `?from=&to=` and forwards them. The new fields ride through in the response JSON automatically.

### C. `src/lib/admin-sync.functions.ts`

- Add `triggerEnglandAthleticsChunk({ fromPage, toPage })`:
  - Auth via `isAdminAuthenticated()`.
  - Calls `runEnglandAthleticsSync({ fromPage, toPage })` and returns the result synchronously (no `Promise.race`, no ack timer).
  - Returns the full result including `lastPage` and `done`.
- `triggerSyncRun` stays put for Scottish.

### D. `src/routes/_adminShell.admin.sync-runs.tsx`

Client-side driver loop for the EA button:

```text
chunkSize = 20
fromPage = 1
loop:
  result = await triggerEnglandAthleticsChunk({ fromPage, toPage: fromPage + chunkSize - 1 })
  invalidate(['admin','sync-runs'])             // table refreshes live
  toast "EA chunk X — N new, M updated"
  if (result.done) break
  if (chunk errored) toast error, break         // don't loop forever on a bad chunk
  fromPage += chunkSize
final toast: "EA sync complete — X new, Y updated across Z chunks"
```

Button disabled while the loop runs. Scottish button unchanged.

### E. EA cron — driver function in Postgres

Uses `pg_net`'s `http_post` + `http_collect_response` to make each chunk synchronous inside the cron tick. Pattern:

```text
create function public.run_england_athletics_chunked() returns void language plpgsql as $$
declare
  v_secret text;
  v_from   int := 1;
  v_chunk  int := 20;
  v_req_id bigint;
  v_resp   record;
  v_done   boolean := false;
  v_last   int := 1;
  v_safety int := 0;       -- hard cap so a broken loop can't run forever
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'import_secret';

  while not v_done and v_safety < 20 loop
    v_safety := v_safety + 1;
    select net.http_post(
      url     := 'https://project--<id>.lovable.app/api/public/admin/sync-england-athletics?from=' || v_from || '&to=' || (v_from + v_chunk - 1),
      headers := jsonb_build_object('Content-Type','application/json','x-admin-secret', v_secret),
      body    := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) into v_req_id;

    select * into v_resp from net.http_collect_response(v_req_id, async := false);
    -- parse v_resp.content json -> done, lastPage; on http error, exit
    v_done := (v_resp.status_code = 200) and ((v_resp.content::jsonb ->> 'done')::boolean = true);
    v_from := v_from + v_chunk;
  end loop;
end;
$$;
```

The `weekly-sync-england-athletics` cron then becomes a one-liner:
`SELECT public.run_england_athletics_chunked();`

Why this works:
- Each `http_collect_response(..., async := false)` blocks the cron tick until the chunk returns. The cron tick itself can run as long as Postgres allows — it's not subject to the Cloudflare Worker limit. Only the *individual chunk* is.
- `v_safety := 20` caps the loop at 400 pages, well above EA's current ~120. Belt-and-braces; the real exit is `done = true`.

### F. Stuck rows

No DB write. The two `running` EA rows from today already display as "stale" in the UI after 10 minutes.

## What we are *not* changing

- `MAX_PAGES = 120` cap inside `runEnglandAthleticsSync` — still there as a final safety net.
- `fetchPageSafe` retry policy (3 × 15s).
- Scottish path, anywhere.
- Anon-public route prefix model.

## Files touched

- `supabase/migrations/<timestamp>_cron_ea_chunked.sql`
  1. Insert `import_secret` into vault (idempotent: `on conflict do update`).
  2. `create or replace function public.run_england_athletics_chunked()`.
  3. `cron.unschedule` + `cron.schedule` both EA and Scottish jobs with the new commands.
- `src/lib/sync-england-athletics.server.ts` — add `lastPage` + `done` to the result.
- `src/lib/admin-sync.functions.ts` — add `triggerEnglandAthleticsChunk`.
- `src/routes/_adminShell.admin.sync-runs.tsx` — client driver loop for the EA button.

## Verification once shipped

1. Click "Run England Athletics now" — watch chunks appear in the table live, stop at chunk 4-7 with `done = true`.
2. Manually invoke the cron driver: `SELECT public.run_england_athletics_chunked();` — same outcome.
3. Check `net._http_response` for 200s on each chunk's URL.
