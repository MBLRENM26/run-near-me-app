# Approved: EA Sync, Weekly Cron, GSC Steps, Organiser URL Corrections

## Duplicate check — confirmed safe

I checked your 904 existing `england-athletics` records: their `norm_id` is `ea-<UUID>`, and the UUIDs are the **same event IDs the RunEvents API returns today**. The new sync will key on exactly that (`ea-${event.id}`), so all existing records are updated in place — dates, organiser URLs, distances refreshed — never duplicated. Existing slugs are also preserved (the sync reuses the stored slug for known records), so no published event URLs change.

## 1. England Athletics sync endpoint

`src/routes/api/public/admin/sync-england-athletics.ts`:
- Pages through the RunEvents API (846 events, 10 per page — page size is fixed by their API; supports chunked runs via `?from=&to=` just in case)
- Upserts on `norm_id = ea-<EA UUID>` with source kept as `england-athletics`
- Maps: name, ISO dates, town (title-cased), county, region via the existing `normaliseRegion` helper (county + coordinates), lat/lng, distances from the structured `races` array, `organiser_url` = their real website_url, `entry_url` = registration URL or website
- New events: name+date dedupe against other sources, slug collision handling (append date)
- Run once and report: updated existing vs new vs skipped

## 2. Weekly scheduled syncs

- Both sync endpoints accept the project's public API key in an `apikey` header (standard pattern for scheduled jobs) alongside the existing admin secret
- Migration: enable `pg_cron` + `pg_net`
- Two weekly jobs (Mon 03:00 Scottish, Mon 03:15 England) POSTing to the stable production URL

## 3. Google Search Console — your steps (no code)

1. Type `/` in the chat composer (or Settings → Connectors) and pick **Google Search Console**
2. Click **Connect**, sign in with the Google account that owns the `runningeventsnearme.com` property, grant read access
3. Tell me once connected — I'll pull the exact affected-URL lists for the soft-404 / noindex / structured-data reports

## 4. Organiser URL corrections from your sheet

Connect the **Google Sheets** connector the same way (account that owns the pipeline sheet). Then I'll:
1. Read `URL_REVIEW` from sheet `1Ss89ap0...G518` (col A norm_id/slug, col N corrected_url)
2. Skip blank / "no website" / "no event found" / "date conflicts" rows; sanity-check URLs
3. Show a dry-run summary (matched/unmatched, samples)
4. Apply ~220 updates as one reviewed data change — you approve before it runs

No throwaway endpoint or migration needed; it's one-shot data with a built-in approval step.

## Technical details

- New file: `src/routes/api/public/admin/sync-england-athletics.ts`; small auth tweak to `sync-scottish-athletics.ts`
- Migration: `CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pg_net;`
- Cron jobs inserted via the data tool (contain project URL + key, so not in migration history)
- EA API: `englandathletics.org/runevents/wp-admin/admin-ajax.php?action=data_api_search&types[]=event&page=N` — public, no auth
