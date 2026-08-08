# RENM — Reminder demand finding, 29 July 2026

Status: aggregate strategy evidence. No personal addresses are reproduced in this record.

## Confirmed from the newly exposed admin table

- 23 distinct stored reminder rows.
- 23 distinct displayed email addresses.
- 17 represented events.
- Subscription dates from 25 June through 29 July 2026.
- One row uses Mike's controlled address.
- 22 apparent external subscribers across 16 events after excluding that row.
- Event concentration: one event has four rows, one has three, one has two and the remaining fourteen represented events have one each.
- Every displayed `Reminder sent` value is blank.

## Strategic interpretation

This is stronger behavioural evidence than pageviews or outbound clicks alone. Runners encountered an unresolved future event need and supplied a direct contact channel across a geographically and operationally varied event set. It supports prioritising entry-opening/change reminders as RENM's first repeat-use loop.

It does not yet prove confirmed consent, successful confirmation delivery, reminder delivery, return visits, completed entries, willingness to pay or commercial organiser value.

## Required evidence before messaging

- Exact public form wording and affirmative action.
- Privacy notice presented at submission.
- Stored consent purpose, timestamp and source.
- Confirmation-token and double-opt-in state, if applicable.
- Provider acceptance, delivery, bounce and suppression evidence.
- Duplicate and abuse handling.
- Unsubscribe mechanism and retention policy.
- Correct event state/change trigger for each requested reminder.
- Reliable `sent` state written only after provider success.

## Live controlled test — 29 July 2026

Mike completed the public reminder form for Rockingham Chase using his controlled address. The form stated that RENM would email approximately one week before the event so the runner would not miss entries closing, required one email address and promised unsubscribe at any time. The success toast said the user was on the list and should check the inbox for confirmation.

An acknowledgement email arrived immediately from the RENM `noreply` sender. It stated that the user was signed up, repeated the race, date and location and linked to the RENM occurrence page. In the content supplied for review, no confirmation action or visible unsubscribe link was shown.

This confirms that submission, persistence and immediate provider delivery work for at least one controlled test. It does not establish that the historic 22 external records received the same message or that scheduled reminders work.

Mike understood that scheduled reminder delivery had never been implemented and had deliberately parked it until sign-up behaviour demonstrated demand. A subsequent 30 July repository audit contradicted that understanding: source contains a reminder endpoint and a migration scheduling it daily at 09:00 UTC. Production job state and execution remain unverified. The records therefore validate the demand question while creating an urgent automation-state reconciliation requirement.

Mike's temporary operating decision was to leave the form unchanged, monitor new requests and respond manually when a verified reminder becomes due. Manual fulfilment must pause until the production cron and queue state are checked, to prevent duplicate or conflicting messages. Discovery of code/migration automation is not approval to run or expand it.

The test also exposes issues requiring reconciliation:

- `confirmation` language is used, but the delivered message appears to be an acknowledgement rather than a double-opt-in confirmation step;
- the form promises a reminder related to entries closing, but the message cites the event date and no verified entry-closing date;
- a subscription was accepted on the displayed event date for a nominal reminder approximately one week beforehand;
- the supplied email content does not visibly contain the promised unsubscribe mechanism;
- `Reminder sent` must distinguish immediate acknowledgement/confirmation from the later scheduled race reminder;
- the occurrence's date, lifecycle, entry state and reminder eligibility must be verified before any scheduled message.

## Product implication

If valid consent and delivery can be established, the next controlled product experiment is:

`unresolved race intent -> reminder subscription -> meaningful verified event change -> delivered reminder -> return visit -> verified next action -> attributable entry where measurable`

Do not expand reminder features until the existing records and delivery path are reconciled.

## Containment — 30 July 2026

Lovable confirmed production cron job 6, `send-race-reminders-daily`, was active but its HTTP requests were receiving `401 Unauthorized`. With Mike's approval, Lovable executed only `select cron.alter_job(6, active := false);`. A post-change catalogue query showed the job retained with its schedule and command unchanged but `active = false`; the other four cron jobs were reported unchanged. No reminder endpoint, subscriber row, email queue, secret, code or deployment was changed.

Reactivation remains unauthorised. The reversible command is `select cron.alter_job(6, active := true);`, but it must not be used until reminder eligibility, consent, fulfilment state and the secret mismatch have been resolved and separately approved.
