## Problem

The "Run now" buttons fail with `TypeError: fetch failed`. The server function `triggerSyncRun` currently does:

```
fetch(`${origin}/api/public/admin/sync-...`, { headers: { "x-admin-secret": IMPORT_SECRET } })
```

In the dev sandbox `origin` is `https://localhost:8080` with a self-signed cert, and the Worker self-fetch from server-fn → its own HTTP route falls over. Even when it works, it's a wasted hop: same process, same code.

## Fix

Stop self-fetching. Run the sync work in-process by extracting the existing handler bodies into shared functions both callers reuse.

### 1. Extract sync core (no behaviour change)

For each source, move the body of the `POST` handler (everything after the auth check) into a plain async function in a new `.server.ts` module:

- `src/lib/sync-england-athletics.server.ts` → `export async function runEnglandAthleticsSync(opts: { fromPage?: number; toPage?: number; order?: "asc"|"desc" }): Promise<SyncSummary>`
- `src/lib/sync-scottish-athletics.server.ts` → `export async function runScottishAthleticsSync(): Promise<SyncSummary>`

`SyncSummary` is the same shape the routes currently return as JSON (`fetched`, `active`, `written`, `newEvents`, `updatedExisting`, `skippedDupes`, `skippedNoDate`, `failedPages`). The `startSyncRun` call stays inside these functions so every invocation — cron, admin button, future caller — logs a row.

### 2. Rewrite the two route handlers as thin wrappers

`src/routes/api/public/admin/sync-england-athletics.ts` and `sync-scottish-athletics.ts` keep:
- The `IMPORT_SECRET` env check
- The `x-admin-secret` timing-safe comparison
- Query-param parsing (EA only: `from`, `to`, `order`)

Then they call the extracted function and `Response.json(summary)`. No logic duplicated. Cron continues to hit these URLs unchanged.

### 3. Rewrite `triggerSyncRun` to call in-process

In `src/lib/admin-sync.functions.ts`:
- Drop `fetch`, `getRequest`, `IMPORT_SECRET` from this function entirely (admin cookie is already the auth here — `isAdminAuthenticated()`).
- Dynamically import the server module inside the handler (same pattern as `supabaseAdmin`, since `.functions.ts` ships to the client bundle):
  ```
  if (data.source === "england-athletics") {
    const { runEnglandAthleticsSync } = await import("@/lib/sync-england-athletics.server");
    const summary = await runEnglandAthleticsSync({});
    return { ok: true as const, summary };
  }
  ```
- Wrap in try/catch and surface `error.message` so the toast shows the real reason instead of "fetch failed".

### 4. Verify

- Click "Run England Athletics now" on `/admin/sync-runs` → toast says success, a new row appears with counts (expected: 0 new, ~X updated, since Monday already ingested everything).
- Click "Run Scottish Athletics now" → same.
- Confirm the existing cron URL still responds 200 by hitting it with the secret header (no behaviour regression).

## Files touched

- New: `src/lib/sync-england-athletics.server.ts`, `src/lib/sync-scottish-athletics.server.ts`
- Edited: `src/routes/api/public/admin/sync-england-athletics.ts`, `src/routes/api/public/admin/sync-scottish-athletics.ts` (shrunk to auth + call)
- Edited: `src/lib/admin-sync.functions.ts` (`triggerSyncRun` calls in-process)

## Out of scope

- Long-running runs: EA sync can take >30s. Worker request timeout still applies whether triggered via HTTP or in-process, so this fix doesn't change that ceiling. If a manual run times out we'd add a background-task pattern in a follow-up.
- No changes to the cron schedule, the `sync_runs` table, or the page UI.
