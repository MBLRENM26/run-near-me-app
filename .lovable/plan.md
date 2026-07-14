
# Admin notifications + cron visibility

Goal: never miss a submission again, and know at a glance what the weekly syncs actually did.

## 1. Harden the admin notification path

File: `src/lib/notify.server.ts`

- Remove the silent `try/catch` that swallows everything. Keep failures out of the user-facing submission flow, but always leave a trail:
  - Always insert an `email_send_log` row up front (status `pending`) so we can see the attempt even if enqueue later fails.
  - On any downstream failure (suppression lookup, token upsert, render, enqueue), update that row to `failed` with a real `error_message`. Never return early with no log row.
- Simplify the unsubscribe-token branch. Current code has a "token used but email not suppressed" dead-end that skips sending — this is what silently killed the 09 May and 03 Jul notifications. Just mint a fresh token when the existing one is used (admin address is ours, not a real unsubscribe target).
- Log `[notify]` warnings with the submission id so future misses are greppable.

## 2. Backfill the two missed submissions

One-off admin server fn `resendAdminNotification({ submissionId })` that re-runs `sendNewSubmissionNotification` for a given `submissions.id`. Trigger it from the admin claims page (small "Resend admin email" button per row, admin-only) so:
- We can immediately fire it for the 09 May and 03 Jul submissions.
- Future misses (if any) are one click to recover.

## 3. Safety-net cron: catch anything that slips through

New public route `src/routes/api/public/hooks/notify-missed-submissions.ts` (admin-secret gated, same pattern as existing sync hooks).

Logic:
- Find `submissions` rows created in the last 7 days where no `email_send_log` row exists with `template_name = 'admin-new-submission'` and a matching submission id (encoded via `metadata` or the idempotency key `admin-new-submission-<id>` — we already set that, so we can match on `message_id`/idempotency).
- For each, call `sendNewSubmissionNotification`.
- Return `{ checked, resent, failed }`.

Schedule via pg_cron every 15 minutes.

## 4. In-app "new submissions" indicator

So even if email fails entirely, the admin shell surfaces unseen submissions.

- Add `submissions.seen_at timestamptz null` via migration (and same on `club_claims` if the "listing claim" path uses that table — confirm in the notify wiring).
- New server fn `getUnseenSubmissionCount()` (admin-gated) → count of rows with `seen_at is null`.
- Header of `_adminShell.tsx`: red dot + count on the "Claims" / "Submissions" nav item, polled on mount + every 60s while the admin tab is open.
- Landing on `/admin` calls the same fn and shows a banner: "N new submissions since your last visit — review them".
- Opening the submission row (or a "Mark all seen" action) sets `seen_at = now()`.

## 5. Cron reporting: what each sync actually did

We already write `sync_runs` rows (`fetched`, `active`, `written`, `new_events`, `updated_existing`, `skipped_dupes`, `skipped_no_date`, `failed_pages`, `error_message`). Two gaps:

**A. Surface a summary email after each cron sync.**
New template `admin-sync-summary` sent to the admin address after each weekly sync finishes with:
- Source (EA / Scottish Athletics / SA Clubs)
- Duration, status
- Fetched / new / updated / skipped-dupes / skipped-no-date / failed pages
- Count of events flagged as likely duplicates needing manual review (see below)
- Link to `/admin/sync-runs` and `/admin/events/duplicates`

Wire from `runEnglandAthleticsSync`, `runScottishAthleticsSync`, `runScottishAthleticsClubsSync` at their success/failure exit points (same enqueue pattern as `notify.server.ts`).

**B. Track dedup candidates explicitly.**
Today `skipped_dupes` is opaque. Add a lightweight counter of *ambiguous* matches (same name + same town, different `sort_date` within 14 days, or fuzzy-name matches that didn't auto-merge) written to a new `sync_dedupe_candidates` table (source, sync_run_id, incoming_name, incoming_town, incoming_date, matched_event_id, reason, resolved_at). The `/admin/events/duplicates` page reads from this. Summary email shows the count.

**C. Admin sync-runs page tweak.**
`_adminShell.admin.sync-runs.tsx` already exists. Add a "Last run" summary card per source at the top (status, when, new/updated/dupes/errors) so the story is visible in one glance without scrolling the run history.

## 6. Verify

- Manually fire the "Resend admin email" for the 09 May + 03 Jul submissions.
- Confirm delivery in `email_send_log` and inbox.
- Insert a synthetic test submission → confirm email + in-app badge appear.
- Manually run the safety-net cron with a submission whose log row is deleted → confirm it re-sends.
- Trigger one EA chunk sync → confirm the summary email arrives.

---

## Technical notes

- All new server fns and routes reuse existing patterns: `isAdminAuthenticated()` for admin fns, `x-admin-secret` header (vault `import_secret`) for cron-triggered hooks.
- pg_cron for the safety-net job uses the existing `net.http_post` + vault secret pattern already in place for `run_england_athletics_chunked`.
- Email sends go through the existing pgmq `transactional_emails` queue — no new infra.
- Migrations needed: `submissions.seen_at`, `club_claims.seen_at` (if applicable), new `sync_dedupe_candidates` table with grants + RLS.
- No public-facing changes; all work is admin surface + backend.

## Out of scope

- Redesigning the submission review flow itself.
- Push notifications / mobile.
- Rewriting the sync engines — only their reporting surface changes.
