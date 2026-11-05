# Email update review — 5 November 2026

## Scope and acceptance

Prepared with the `migrate-email-to-managed` skill. Not published. No deployed functions, project send-mode settings, scheduled jobs or database schema were changed. All retained email history tables remain intact. Scheduled race reminders remain fail-closed; no subscriber or historic-recipient sends were exercised.

## Survey and conversion

- Six identical stock `*_email_infra.sql` files were fully read and removed from the repository only.
- Legacy queue processor, suppression handler, transactional send route and unsubscribe route were fully read and replaced before repository deletion.
- No existing account-email hook was present; the offered scaffold created managed authentication templates and handlers. The auth hook remains exactly as scaffolded.
- Existing admin submission/contact notices, sync summaries, reminder confirmations and disabled scheduled reminder path now use the scaffolded template sender. Registered templates, subjects, recipients and feature trigger keys were preserved. No unrelated third-party sender was found or left untouched.
- Kept-table writes remain append-only receipts: `sent` after successful dispatch, `suppressed` on managed suppression and `failed` on throws. Receipt errors are checked and logged, never allowed to change the send outcome.
- The events receiver preserves `bounce` / `complaint` / `unsubscribe` reasons and `bounced` / `complained` / `suppressed` statuses, `system` template name and legacy explanatory strings. Metadata remains null. Event-derived stable receipt IDs deduplicate deliveries. Write failures throw for webhook retry. Retained suppression rows are audit-only, never consulted to permit or deny a send.
- Removed pending/queue mechanics, token issuance and local pre-send suppression checks. A rate-limited feature send waits the SDK cooldown before returning to an existing caller loop; no persistent retry state was added.
- Reminder `reminder_sent_at` is now written only on successful dispatch; the disabled gate remains before auth and all side effects.

## Observed verification

- Harness build entries after replacement and deletion: build OK.
- Five focused test files, 22 tests passed: send audit, outcomes, reminder containment, sync-log behavior and existing confirmation-copy test.
- Running-app homepage rendered with no browser errors.
- All four app-email template previews returned `ready`; signup preview returned 200.
- Unsigned auth and outcome webhooks returned 401.
- Scheduled reminder endpoint returned 503.
- No real send was attempted. Production delivery and production-only event callbacks remain unverified until publication and a separately authorised test.

## Review and permanence

The live application is unchanged until Mike publishes. Publishing completes the email update permanently; it cannot be undone. No automatic reminder activation is authorised by this update.