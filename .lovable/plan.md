Domain `notify.runningeventsnearme.com` is verified. Two things still need to happen before admin notification emails actually land in your inbox.

## 1. Activate the email queue (cron job)

The queue dispatcher route and database tables were set up in the previous turn, but the cron job that drains the queue every 5 seconds couldn't be activated yet — the preview build needs the route to be reachable. I'll:

- Re-run email infrastructure setup so the cron job gets registered against the now-deployed `/lovable/email/queue/process` route.
- Confirm the `process-email-queue` cron job exists in the database.

Until the cron job is running, anything enqueued just sits there.

## 2. Replace the notification stub with a real transactional email

Right now `src/lib/notify.server.ts` calls a placeholder URL and logs to the console. I'll swap it for the real flow:

- Add a transactional email template `admin-new-submission` (plain, branded, sender = `notify@runningeventsnearme.com`, recipient = `mike@hithe19.com`) containing: submitter email, kind (claim/listing), claim slug, submitted date, and a link to `/admin/claims`.
- Register it in `src/lib/email-templates/registry.ts`.
- Scaffold the transactional send route (`/lovable/email/transactional/send`) plus the unsubscribe + suppression routes.
- Create a tiny server-side helper that enqueues the email using the service role key (the public form is unauthenticated, so we can't go through the JWT-guarded client helper).
- Update `notify.server.ts` to call that helper instead of the stub. Errors stay swallowed so submissions never fail because of email problems.

## 3. Smoke test

- Submit a test claim via `/list-your-event?claim=…`.
- Confirm a row appears in `email_send_log` with status `sent`.
- Confirm the email arrives at `mike@hithe19.com`.

## Out of scope

- No changes to the admin queue UI, auth, or privacy page.
- Not touching auth emails (signup/password reset) — those still use Lovable defaults and are fine for now. Happy to brand them separately later if you want.
- Not scaffolding an `/unsubscribe` page yet, since the only recipient is you and the footer unsubscribe link is system-managed; we can add the branded page when we start sending to end users.

## Technical notes

- Sender domain constant in the send route will be `notify.runningeventsnearme.com` (the verified subdomain), with the From header showing `notify@runningeventsnearme.com`.
- The TS workaround in `process.ts` (`supabase: any`) stays until `types.ts` regenerates with the new email tables — purely a typing concession, no runtime impact.
- `submitListing` already fires `sendNewSubmissionNotification` fire-and-forget, so no changes needed to the submission server function itself.
