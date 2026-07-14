## Goal

Turn submissions from a passive inbox into a proper intake pipeline: structured data on the way in, a one-click path to a published event on the way out, and light housekeeping for the noise.

## Workflow (what will change)

Today the submission form is a free-text blob and the admin dashboard is bookkeeping-only — nothing is written to `events` when you tick "actioned". After this change:

```text
Runner submits structured form
   ↓
Row lands in submissions (status=new)
   ↓
Admin email + in-app badge (already in place)
   ↓
Admin reviews at /admin/claims
   ↓
Clicks "Create event from submission"
   ↓
Opens /admin/events/new pre-filled from structured fields
   ↓
Admin edits + publishes → event exists
   ↓
Submission auto-marked actioned, linked to event id
```

Rejected/spam rows stay in the table as an audit trail; spam auto-purges after 30 days.

## Phase 1 — Structured submission form

Rework `/list-your-event` to collect the fields the event editor needs. Keep it single-page, keep friction reasonable.

Required:
- Race name
- Date (date picker)
- Website / registration URL
- Contact email

Optional but strongly encouraged:
- Distances (multi-select: 5K, 10K, half, marathon, ultra, other + free text)
- Town + county
- Postcode (for geocoding)
- Organiser name
- Terrain (road / trail / fell / multi-terrain / track)
- Entry fee
- Notes (the old free-text field, kept for "anything else")

Client-side zod validation + server-side re-validation in `submitListing`. Existing claim flow (`?claim=slug`) preserved — those get a minimal variant of the form.

## Phase 2 — Database changes

Add columns to `submissions` so structured data has somewhere to live without breaking existing rows:

- `race_name` text
- `race_date` date
- `website_url` text
- `distances` text[]
- `town` text
- `county` text
- `postcode` text
- `organiser` text
- `terrain` text
- `entry_fee` text
- `created_event_id` uuid (FK to `events.id`, nullable) — set when "Create event from submission" completes, so we can show "Published →" on the submission

`event_details` (the old free-text) stays as a general notes field. Existing rows unaffected.

## Phase 3 — "Create event from submission" action

- New server fn `createEventFromSubmission({ submissionId })` in `admin.functions.ts`. Reads the structured fields, inserts a **draft** event (status = pending/draft, not ACTIVE), returns the new event id. Sets `submissions.created_event_id` and `submissions.status = 'actioned'` in the same transaction.
- New UI on each `SubmissionRow`: a primary "Create event" button (only shown when status is `new` or `in_review` and `created_event_id` is null). When `created_event_id` is set, show "View event →" linking to `/admin/events/<id>` instead.
- After creation, navigate the admin to `/admin/events/<id>` to review, tidy the fields the sync scrapers would normally handle (slug, sort_date, geocoding), and flip status to ACTIVE when ready.
- Deliberately NOT auto-publishing — you keep the final "is this good enough to go live" gate.

## Phase 4 — Spam auto-purge

- Add a daily cron `purge-spam-submissions-daily` (03:00 UTC) that deletes `submissions` where `status='spam'` and `submitted_at < now() - interval '30 days'`.
- SQL-only cron (no server route needed) via `pg_cron`.
- `rejected` rows kept indefinitely as audit trail.

## Files to change

- `src/routes/list-your-event.tsx` — new structured form UI
- `src/lib/admin.functions.ts` — expand `submitListing` validator + insert; add `createEventFromSubmission`
- `src/components/admin/SubmissionRow.tsx` — render structured fields nicely; add "Create event" / "View event" button; wire `created_event_id` state
- Migration: add columns to `submissions`, add spam-purge cron
- `src/lib/admin.functions.ts` `SubmissionRow` type — extend to include the new fields

## Non-goals (explicitly out of scope)

- No changes to EA / Scottish Athletics sync — this is only the manual submission path.
- No auto-publish; every new event still goes through you.
- No email to the submitter on rejection (can add later if you want).
- The Dorstonerunner submission stays as-is — you'll email them manually and mark it actioned once you've created the event.

## Answers to your other questions

- **"If I tick actioned, is it written to the database and published?"** — Not today, and not after this change either. `actioned` remains a status flag. Publishing requires clicking the new "Create event from submission" button, which drops a *draft* event; you flip it live from the event editor. This keeps the human gate.
- **"Where do rejected/spam rows go?"** — Nowhere: they stay in the `submissions` table with that status, hidden from the default "new" view. After this change, `spam` older than 30 days is deleted by cron; `rejected` is kept forever.
