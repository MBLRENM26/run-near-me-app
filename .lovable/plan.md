## What's actually going on

The EA sync **worked** — the row in the DB now reads:

```
england-athletics  1m 8s  partial  new=91  updated=468  fetched=811  failed_pages=25
```

The UI showed it stuck on "running" because:

1. The client-side `fetch` to the server-fn times out around 30s, so the mutation throws.
2. Our mutation only invalidates the table on **success**, not on error, so the page never re-queries to discover the row that completes 30–60s later.
3. There's no polling, so even a successful long run wouldn't update the table mid-flight.

Meanwhile the Worker kept executing after the response was cut and finished the sync correctly. So this is purely a UI / feedback problem — no sync logic to change.

(`status: partial` = EA API 500'd on 25 of 811 pages; the rest succeeded. Re-running typically picks those stragglers up. Not a bug in our code.)

## Fix

All in two files. No DB changes.

### 1. Poll while runs are in flight, invalidate on every settle

`src/routes/_adminShell.admin.sync-runs.tsx`:

- Add `refetchInterval` to the `getSyncRuns` query: **3000ms while any row has `status: "running"`, otherwise `false`**.
- Mutation `onMutate`: invalidate the query so the new `running` row (written by `startSyncRun` before any HTTP work) appears within ~3s.
- Mutation `onSettled` (covers both success and error): invalidate again. This is what we were missing — when the client fetch times out, we still need to refresh.
- Disable the buttons for a source if (a) a mutation is in flight, or (b) the latest row for that source is `running`. Prevents double-firing.

### 2. Stop treating client timeout as failure

`src/lib/admin-sync.functions.ts`, `triggerSyncRun`:

- Wrap the in-process sync call in `Promise.race` with an 8s "ack" timer.
- If the sync resolves first → return real result, toast shows counts (Scottish path, ~3s).
- If the ack timer fires first → return `{ ok: true, started: true }` and **let the `await` continue in the background** (TanStack Start keeps the isolate alive for the outer handler promise). The toast says "Sync started — table will update when it finishes".
- If the sync rejects before the ack fires → throw as today, real error message in toast.

The work itself already calls `run.finish()` from inside `runEnglandAthleticsSync` regardless of whether the client is still listening, so the row always gets closed out properly. (Confirmed by the EA row above, which closed cleanly with all counts populated even though the client timed out.)

### 3. Render stale "running" rows as `stale`

In the table renderer in the same page file:

- Derive a display status: if `status === "running"` and `Date.now() - started_at > 10 min`, render pill as `stale` (amber). Otherwise keep `running` (blue).
- No DB write. Purely so a genuinely dead run (e.g. if a future runtime change does kill the background continuation) is visually distinguishable from one in progress.

### 4. Verify

- Click **Run England Athletics now**:
  - Within ~3s a `running` row appears at the top.
  - Toast: "Sync started — table will update when it finishes".
  - Both buttons disabled.
  - Table auto-refreshes every 3s.
  - 60–90s later the row flips to `success` / `partial` with counts; polling stops; buttons re-enable.
- Click **Run Scottish Athletics now**: resolves inside the 8s ack window so toast shows real counts immediately, single refetch, polling never starts.
- The existing 13:57 EA row that's already `partial` keeps showing `partial` — no change to historical data.

## Out of scope

- Chunking the EA sync into batched runs. Tempting, but the current single run already completes in ~68s in the background and writes the row correctly — the only thing broken was the UI's awareness of it. Adding chunking now would add real complexity (orchestration, partial-of-partial accounting) for no extra reliability.
- Cleaning up the stuck 13:57 row from before this fix — it's already `partial` in the DB; no stuck rows currently exist. The `stale` pill in step 3 covers future cases.
- `waitUntil` / true Cloudflare background tasks — not needed; the handler `await` already keeps the worker alive past the early return on this runtime.

## Files touched

- `src/routes/_adminShell.admin.sync-runs.tsx` — polling, optimistic + onSettled invalidate, stale pill, button disable.
- `src/lib/admin-sync.functions.ts` — `triggerSyncRun` returns early after 8s ack instead of waiting forever.
