# RENM Phase 0 — context installation + read-only conflict report

Date: 30 July 2026. Authority order as per the Phase 0 prompt. No code, schema, data, policy, cron, queue, UI or deployment state has been changed in producing this report; all findings below come from read-only queries and repository reads.

Note on the one authorised write: installing the four context documents as durable project knowledge is a file write, which plan mode does not permit. It is listed as work package WP0 below and will be performed first on approval.

## A. Confirmed production facts (queried live)

1. `send-race-reminders-daily` **exists and is active** (`cron.job` jobid 6, schedule `0 9 * * *`), posting to `https://project--fa471d0b-…lovable.app/api/public/hooks/send-race-reminders` with `x-admin-secret` from `vault.decrypted_secrets.import_secret`.
2. It has run **35 times, all `succeeded`**, 26 June – 30 July 2026. `succeeded` means pg_cron dispatched the HTTP call, not that the endpoint accepted it.
3. **The endpoint is rejecting every call.** `net._http_response` (short retention, today only) shows `401 {"error":"Unauthorized"}` at 09:00:00 today for the reminder job, and the same `401` at 08:15 for `notify-missed-submissions-daily`. Both jobs use the same vault secret. Root cause is a mismatch between `vault.secrets.import_secret` and the deployed `IMPORT_SECRET` environment value (or a stale copy of it).
4. **No reminder has ever been sent.** `email_send_log` has zero rows of any status for `template_name = 'race-reminder'`. It has 24 `sent` and 24 `pending` rows for `race-reminder-confirmation` (25 June – 29 July), i.e. immediate acknowledgements were accepted by the queue and provider.
5. All 24 subscription rows have `reminder_sent_at = NULL`; every linked event is `status = 'ACTIVE'`.
6. **Promises already breached:** two subscribers had a seven-days-before due date fall after their signup and before today (due 2026-07-22 and 2026-07-25) and received nothing.
7. **Imminent:** the next due dates are **2026-07-31 (tomorrow)**, 2026-08-01 and 2026-08-05. On present evidence those sends will also 401 and silently fail.
8. Other active jobs sharing the same auth path: `weekly-sync-scottish-athletics`, `notify-missed-submissions-daily` (confirmed 401 today). `weekly-sync-england-athletics` and `purge-spam-submissions-daily` are pure SQL and unaffected.

## B. Repository observations

- `src/routes/api/public/hooks/send-race-reminders.ts` matches subscribers on `events.sort_date = today + 7` exactly — a single-day window with no catch-up. A missed or 401'd day is unrecoverable.
- It uses `sort_date`, not a verified entry-closing date or entry state, contradicting the lifecycle contract's separation of entry state from schedule.
- It writes `reminder_sent_at` unconditionally, including on suppression and queue failure, collapsing the five stages the incident audit requires into one boolean.
- `src/lib/subscriptions.functions.ts` has zod + a unique constraint but no rate limit, bot control or double opt-in; the same address can be paired with unlimited event IDs to trigger mail. Its comment describing validation as anti-abuse is inaccurate.
- `race-reminder-confirmation.tsx` renders no visible unsubscribe link; an unsubscribe token is passed to the queue, so header-level unsubscribe is plausible but unverified against the provider.
- `_adminShell.tsx` has no route-level session guard; unauthenticated server functions return empty results, so an auth fault renders as "zero subscribers".
- The 24 `pending` + 24 `sent` confirmation rows are one append-only pair per message, not 24 undelivered emails.

## C. Inference (not yet evidenced)

- The 401s most likely date from the vault bootstrap being taken before the current `IMPORT_SECRET` value, or from a later secret rotation. Retention prevents proving when the 401s began; the absence of any `race-reminder` log row implies since inception.
- The published deployment is assumed to be built from `main` head `94e3aa77`; this is not verifiable from inside the project.

## D. Conflicts with the approved documents

| Doc | Conflict |
|---|---|
| Lifecycle contract §1 | Everything keys off `ACTIVE` + `sort_date`; no lifecycle/visibility/entry-state separation exists in the reminder path. |
| Lifecycle contract (entry state) | Reminder promises "before entries close" but triggers on race date. |
| Decision register R10 | Reminders are doctrine as a retention channel but have never delivered. |
| Decision register R03 | `reminder_sent_at` asserts fulfilment that did not occur. |
| Incident audit | Admin subscriber view cannot distinguish empty data from unauthenticated. |
| Codebase health audit | Confirmed: a sender and cron do exist; the documentation statement that none was implemented is wrong. The cron is active but unauthorised. |

## E. Unknowns requiring Mike or production evidence

1. Whether `IMPORT_SECRET` was rotated, and which value the published deployment holds (secret values are not readable here).
2. Provider-side delivery/bounce evidence for the 24 acknowledgements beyond queue acceptance.
3. Whether the two breached subscribers should receive an apology/late message — a messaging decision, explicitly out of Phase 0 scope.
4. Consent wording and privacy-notice version stored at submission time (not currently persisted).
5. Whether the published build equals `main` head.

## F. Proposed narrow work packages (none authorised yet)

- **WP0 — Context installation (the one authorised write).** Install the four RENM documents as durable project knowledge and index them. No code or data change.
- **WP1 — Cron authentication repair (urgent, before 31 July 09:00 UTC).** Re-sync the vault `import_secret` to the deployed `IMPORT_SECRET` and verify with one observed non-401 response. Decide first whether to pause job 6 so the repair does not fire an unreviewed batch. Requires explicit approval — a working sender immediately emails real subscribers.
- **WP2 — Honest fulfilment state.** Replace the `reminder_sent_at` boolean with separate acknowledged / due / attempted / delivered / suppressed / unsubscribed states; write `sent` only after provider success; widen the due window to catch-up rather than exact-day.
- **WP3 — Consent and abuse.** Double opt-in or stored affirmative-consent record with wording version, visible unsubscribe in template, and the existing `consume_submission_rate` limiter applied to the reminder endpoint.
- **WP4 — Admin ledger honesty.** Distinguish unauthenticated from empty in the subscribers view; add a route-level admin guard on `_adminShell`.
- **WP5 — Cron observability.** Persist HTTP status per cron invocation so a 401 is visible instead of `succeeded`.

Sequence: WP0 now; WP1 as a separate, individually approved decision; WP2–WP5 only after WP1's outcome is reviewed.
