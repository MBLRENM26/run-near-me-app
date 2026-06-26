# Fix: Scottish Athletics clubs sync stuck on "Running…"

## Diagnosis

A row exists in `sync_runs` for `scottish-athletics-clubs` with `status='running'`, `started_at` ~now, `finished_at` NULL. That means:

1. The sync started (row was inserted).
2. The server function hit the 8s ACK timeout in `triggerSyncRun`, returned `{ started: true }`, and the UI started polling.
3. The Cloudflare Worker invocation **ended when the response was sent**. The `work` promise we kicked off in the background was not held by `ctx.waitUntil`, so the Worker terminated mid-sync. The `sync_runs` row never got a `finish()` update, so the UI polls forever.

Root cause: the current shape (`work` promise + ACK timeout → return early → background continues) does not work on Cloudflare Workers. Background work after the response is killed.

Secondary issue: even if it did keep running, the clubs sync makes ~140 sequential `GetDetails` HTTP calls. At a few hundred ms each that's 30–60s — well past the Worker wall-time budget even without the background-termination bug.

## Fix

Make the clubs sync finish **inside the ACK window** so it returns synchronously like the Scottish events sync does, and clear the stuck row.

### 1. Parallelise detail fetches in `src/lib/sync-scottish-athletics-clubs.server.ts`

Replace the sequential `for (const club of all) { await fetchClubDetail(...) }` with a bounded-concurrency batch (concurrency 10). With ~140 clubs that's ~14 rounds; at ~300–500 ms per call it completes in roughly 5–7 s, well under the 8 s ACK budget and comfortably inside the Worker wall-time limit.

Implementation sketch:

```ts
const CONCURRENCY = 10;
const details = new Array<ClubDetail | null>(all.length);
for (let i = 0; i < all.length; i += CONCURRENCY) {
  const batch = all.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map((c) => fetchClubDetail(c.SyncGuid).catch(() => null)),
  );
  for (let j = 0; j < results.length; j++) details[i + j] = results[j];
}
```

Then iterate `all` + `details[i]` together to build the `rows` array (same logic as today, just without the inline `await`).

Also tighten the per-call timeout from 15 s → 8 s to fail fast on a stuck request rather than dragging the whole batch.

### 2. Return synchronously from `triggerSyncRun` for the clubs source

Today every non-EA source goes through the 8 s ACK race in `src/lib/admin-sync.functions.ts`. That's fine for Scottish events (~4 s) but the background-after-ack pattern is unsafe on Workers in general.

After step 1 the clubs sync finishes in ~5–7 s, so it will naturally win the ACK race and the UI will show the toast with counts. No code change needed in `admin-sync.functions.ts` — but keep an eye out: if a future run trips the timeout, the row will hang again. Acceptable for now because the EA chunked driver is the long-term pattern for long syncs and clubs are intentionally a single shot.

### 3. Clear the stuck row

Mark the existing `running` row as errored so the table reads cleanly and `isSourceBusy` releases the button. One small SQL migration:

```sql
update public.sync_runs
   set status = 'error',
       finished_at = now(),
       error_message = 'Worker terminated before sync completed (pre-fix)'
 where source = 'scottish-athletics-clubs'
   and status = 'running'
   and finished_at is null;
```

## Files

- `src/lib/sync-scottish-athletics-clubs.server.ts` — parallelise `fetchClubDetail`, tighten timeout
- new migration — clear the stuck `sync_runs` row

## Out of scope

- Switching the clubs sync to the EA-style chunked driver (not needed at 140 clubs)
- Adding `ctx.waitUntil` plumbing for true background work (no current use case once clubs sync fits in ACK)
- Re-running the backfill — user can click "Backfill Scottish organiser URLs" once the clubs sync finishes successfully
