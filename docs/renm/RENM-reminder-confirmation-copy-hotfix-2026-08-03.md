# RENM reminder-confirmation copy hotfix

Date: 3 August 2026

Status: deployed and verified

Authoritative Lovable commit: `9212332020bd18b814b3ad79f887c5c01124d79f`

## Cause

The first new request after containment exposed that first-time reminder submissions automatically enqueue and send a transactional `race-reminder-confirmation`. This is separate from scheduled reminder fulfilment. The original confirmation copy said the user was signed up and promised an email about a week before the race.

Database evidence for the Temple Newsam request showed a confirmation log moving from `pending` to `sent` at 20:49:39 BST on 2 August. Its subscription row remained without `reminder_sent_at`. No `race-reminder` template send existed and cron job 6 remained inactive.

## Approved copy change

- Subject: `Your reminder is confirmed for [event]`.
- Preview: `Your reminder for [event] is confirmed`.
- Heading: `Your reminder is confirmed`.
- Opening: `Thanks for your reminder request for [event]. It’s been noted and we’ll be in touch with a reminder.`
- Form success: `Your reminder is confirmed. Check your inbox for confirmation.`

No internal/manual handling language is shown to the requester.

## Scope and evidence

Changed only:

- `src/lib/email-templates/race-reminder-confirmation.tsx`;
- `src/components/events/RaceReminderSignup.tsx`;
- `src/lib/email-templates/race-reminder-confirmation.copy.test.ts`.

TypeScript passed, Vitest passed 38/38 and the production build passed. Deployed bundle inspection confirmed the new success copy and server template copy. A live event page loaded with the reminder form and no console errors. No subscriber, historic address or test address was messaged during verification.

The deployment gate initially raised `events_table_public_source_exposure`. Direct live checks proved it stale/false: `anon` has no table SELECT and cannot select `source`, `source_url` or `organiser_club_id`; it retains 38 of 41 column grants. The finding was resolved as false, not accepted as risk. No grant, RLS, view, database or data change was made. The separate public MCP warning remains untouched.

## Operating distinction

- Automatic confirmation: active on a first successful request.
- Scheduled reminder fulfilment: inactive; job 6 remains inactive and the reminder HTTP sender remains fail-closed.
- `reminder_sent_at`: records reminder fulfilment, not confirmation delivery.
