# Scottish Athletics organiser_url backfill + sync fix

## What the probing confirmed

The Scottish Athletics club finder is a JustGo widget on the same `WidgetService.mvc/ExecuteWidgetCommandAlt` endpoint we already call for events. No scraping needed.

- **List** (`GetFilterData`, Area=Club, WebletId=`64728f3b-...-e70f15955657`) returns 139 clubs with `Name`, `Address`, `Latlng`, `EmailAddress`, `SyncGuid`. No website on the list row.
- **Detail** (`GetDetails`, Area=Club, by `SyncGuid`) returns `Website` (e.g. `"AberdeenAAC.co.uk"` — bare host, needs normalising), `SocialMediaInfo`, region, disciplines.

139 clubs ≈ 141 HTTP calls per full pull, well within the worker budget.

## Schema notes (verified)

- `clubs` has unique constraints on **both** `norm_id` and `slug`. Either works as the `onConflict` target, but the dual constraint means an English club sharing the same slug would block a Scottish insert even when `onConflict='norm_id'` matched nothing. Mirror the events-sync pattern: upsert on `norm_id`, and on slug collision with a row that has a different `norm_id`, suffix the slug (`<slug>-scotland`).
- `clubs.source` is a free-text column. Use the value `"scottish-athletics"` consistently — same string everywhere (sync writes, backfill query, future read filters). The sync **run name** in `sync_runs.source` is a different field and is allowed to be `"scottish-athletics-clubs"` to distinguish it from the events sync run.

## Plan

### 1. New sync: Scottish Athletics clubs → `clubs` table

New file `src/lib/sync-scottish-athletics-clubs.server.ts`, mirroring `sync-scottish-athletics.server.ts`:

- Paginate `GetFilterData` for Area=Club to collect all `SyncGuid`s.
- For each, call `GetDetails` to get `Website` and `SocialMediaInfo`.
- Normalise `Website`: trim, add `https://` if missing scheme, drop trailing slash, lowercase host. Skip values that aren't plausible URLs (no dot, contains spaces, etc.).
- Build slug from `Name`; on collision with a different `norm_id`, suffix with `-scotland`.
- Upsert on **`norm_id`** with: `norm_id = scottishathletics-<slug>`, `slug`, `name`, `town`, `county`, `region` = "Scotland", `country` = "Scotland", `lat`, `lng`, `website_url`, `contact_email`, `governing_body` = "scottish-athletics", **`source` = "scottish-athletics"**, `source_url` = JustGo profile URL, `status` = "ACTIVE".
- Logs via `startSyncRun("scottish-athletics-clubs")` (this string only lives in `sync_runs.source`, not on club rows).

Wire it in:
- Add `"scottish-athletics-clubs"` to `SYNC_SOURCES` in `src/lib/admin-sync.functions.ts` and dispatch in `triggerSyncRun`.
- Add an admin button on `_adminShell.admin.sync-runs.tsx` to trigger manually.
- Public endpoint `src/routes/api/public/admin/sync-scottish-athletics-clubs.ts` (same `x-admin-secret` shape) so a weekly `pg_cron` can call it later. We do **not** schedule the cron in this PR.

### 2. Part 1 — Backfill the 96 existing events

One-off admin server function `backfillScottishOrganiserUrls` in `src/lib/admin-events.functions.ts`:

- Select active upcoming events with `source = 'scottishathletics'` and `(organiser_url IS NULL OR organiser_url = '')` and non-null `organiser`.
- Look up `clubs` rows where **`source = 'scottish-athletics'`** (same string the sync writes) and `slugify(name) = slugify(organiser)`. Case-insensitive equality only — no fuzzy matching in v1.
- Where matched and the club has a non-null `website_url`, update `events.organiser_url`.
- Return `{ matched, updated, unmatched: string[] }` so the admin UI surfaces non-club organisers ("Blast Running", individuals) that stay NULL by design.

Triggered once from the admin sync-runs page after the clubs sync has run.

### 3. Part 2 — Wire matching into the events sync going forward

In `src/lib/sync-scottish-athletics.server.ts`, after collecting `rows` but before the upsert:

- Build `Map<slugifiedName, website_url>` by reading `clubs` where `source = 'scottish-athletics'` and `website_url IS NOT NULL` (single SELECT).
- For each row, set `organiser_url = map.get(slugify(row.organiser))` when present. Leave `NULL` otherwise.
- **Never** set `organiser_url` to the JustGo `Directlink` — that's the booking platform.

### 4. Rollout order

1. Ship the code.
2. Admin: trigger "Sync Scottish Athletics clubs" → verify ~139 rows with most `website_url` populated.
3. Admin: trigger "Backfill Scottish organiser URLs" → expect ~60–75 of the 96 to be filled.
4. Spot-check Scottish events reappear on homepage radius + region pages.
5. Next Monday's 03:00 events cron picks up new events with `organiser_url` already set.

### 5. Out of scope

- Adding a weekly `pg_cron` schedule for the new clubs sync (one-line SQL follow-up).
- Fuzzy / token-based organiser→club matching (only add if step 3 shows it's needed).
- Backfilling clubs from other governing bodies.
- Surfacing the new clubs anywhere in the UI.

## Files

**New:**
- `src/lib/sync-scottish-athletics-clubs.server.ts`
- `src/routes/api/public/admin/sync-scottish-athletics-clubs.ts`

**Edited:**
- `src/lib/sync-scottish-athletics.server.ts` (organiser→website lookup before upsert)
- `src/lib/admin-sync.functions.ts` (`SYNC_SOURCES`, `triggerSyncRun` dispatch)
- `src/lib/admin-events.functions.ts` (new `backfillScottishOrganiserUrls`)
- `src/routes/_adminShell.admin.sync-runs.tsx` (buttons for new sync + backfill)
- `mem://index.md` + new memory entry once shipped
