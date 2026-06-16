## What Monday's cron actually did

Both weekly syncs fired successfully on Monday 15 June at 03:00 / 03:15 UTC (pg_cron's run history confirms it). But **0 new events were added** — the last batch of new rows in `events` is from 9 June (365 from England Athletics, 102 from Scottish Athletics). Monday's run upserted the same set: everything already existed by `norm_id`, so nothing was inserted.

The reason we can't see this in the admin panel today is that the sync endpoints return a JSON summary (`{ fetched, written, newEvents, updatedExisting, skippedDupes, failedPages }`) to the caller — but pg_cron just fires the HTTP request and throws the response away. Nothing is persisted.

## Plan: persist each sync run + surface in admin

### 1. New table `sync_runs`
Stores one row per cron-triggered sync attempt.

Fields:
- `source` — e.g. `england-athletics`, `scottish-athletics`
- `started_at`, `finished_at`, `duration_ms`
- `status` — `success` | `partial` | `error`
- `fetched`, `active`, `written`, `new_events`, `updated_existing`, `skipped_dupes`, `skipped_no_date`, `failed_pages`
- `error_message` (nullable)

RLS on, no policies, no anon/authenticated grants — `service_role` only (same posture as `search_logs`).

### 2. Endpoint changes (`sync-england-athletics.ts`, `sync-scottish-athletics.ts`)
- Insert a `sync_runs` row at the start (status = `running`), capture its id.
- On success: update the row with the counts and `finished_at`.
- On any thrown error / non-OK return: update the row with `status = 'error'` and `error_message`, then return the existing error response.
- No behaviour change beyond logging.

### 3. New admin page `/admin/sync-runs`
- Server fn `getSyncRuns()` (admin-gated, like the other admin fns) returns the last ~50 runs.
- Table columns: Source · Started · Duration · Status · New · Updated · Skipped · Failed pages · Error.
- Filter chips per source. Row click → expandable raw JSON for debugging.
- Add a link to it from the existing admin shell nav (alongside Events / Claims / Search).

### 4. (Optional, ask first) Manual "Run now" buttons
Trigger the sync endpoints from the admin page so we don't have to wait for Monday to validate fixes. Re-uses the existing `IMPORT_SECRET` header path. Happy to include or leave for a follow-up.

## Files touched
- `supabase/migrations/<new>.sql` — create `sync_runs` + grants + RLS
- `src/routes/api/public/admin/sync-england-athletics.ts` — log run
- `src/routes/api/public/admin/sync-scottish-athletics.ts` — log run
- `src/lib/admin-sync.functions.ts` (new) — `getSyncRuns` server fn
- `src/routes/_adminShell.admin.sync-runs.tsx` (new) — admin page
- `src/routes/_adminShell.tsx` — add nav link

## Out of scope
- Backfilling Monday's run (we'd be guessing the counts; first logged run will be next Monday or whenever you hit "Run now").
- Any change to the cron schedule itself.

Want me to include the "Run now" buttons in step 4, or keep this read-only for now?