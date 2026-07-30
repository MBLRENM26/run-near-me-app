# RENM — Lovable Phase 0 context installation and conflict report

Status: ready for Mike's approval. This instruction authorises context installation and read-only inspection only.

## Objective

Install the attached approved RENM context documents as the current authority, inspect the existing project against them and return a conflict and implementation-gap report. Do not implement fixes in this operation.

## Context authority

Use, in order:

1. `RENM-project-knowledge.md`
2. `RENM-data-lifecycle-contract.md`
3. `RENM-decision-register.md`
4. `RENM-phased-build-brief.md`
5. Current production code/schema as evidence of current behaviour, not automatic intended behaviour
6. Historic Strategy Bible and Project Bible for history only

Raise conflicts explicitly. Do not silently merge incompatible instructions.

## Absolute mutation boundary

Do not change application code, database schema or data, access policies, secrets, environment configuration, scheduled jobs, analytics, UI, routes, redirects, domains or deployment state. Do not import Kent, South London or any organiser-research data. Do not build an organiser portal, syndication layer or new feature.

Installing these documents as Project Knowledge/context is the only authorised write.

## Required report

Return a dated report containing:

1. Current repository/branch/commit and deployed-version identifiers where visible.
2. Every conflict between current implementation and the approved documents, with affected files, functions, tables, policies, routes and jobs.
3. A dependency map for the smallest safe Phase 1 and Phase 2 work packages.
4. Migration and rollback risks, including where multiple product surfaces implement different eligibility rules.
5. Unknowns requiring Mike, repository or production evidence rather than assumption.

## Mandatory inspection areas

- Anonymous access to base tables and private provenance/moderation fields.
- Public test records and known or suspected duplicate occurrences.
- Every use of `ACTIVE`, public/live/countable/discoverable/indexable eligibility and `sort_date` null handling.
- Homepage counts, search, filters, map, occurrence pages, organiser/series pages, sitemap, structured data and direct URLs.
- Organiser, host, race-director, registration-provider, timer and results-operator modelling or conflation.
- Official-information, entry, waitlist, organiser-context and results destinations.
- Entry-state derivation, destination verification, checked time and stale/broken-link behaviour.
- Reminder consent, delivery, retry, unsubscribe, suppression and retention behaviour.
- Critical subscriber incident: after the visibility failure was discovered, a quick admin interface exposed 23 stored reminder rows across 17 events, dated 25 June–29 July. One uses Mike's controlled address; 22 appear external across 16 events. All displayed `Reminder sent` values are blank. Reconcile the public submission path, database tables/views, RLS and admin-query filters, auth/session behaviour, edge/server functions, email-provider records, confirmation tokens, notification jobs and logs. Report each record's state without exposing full email addresses. Determine whether each submission was stored, validly consented, confirmed, notified, delivered, suppressed, duplicated or orphaned. Do not send messages, recreate rows, confirm consent, export addresses or delete data.
- Inspect the newly added subscriber admin interface as an unreviewed production mutation: identify its exact commit and query, authentication/authorisation boundary, exposed fields, pagination/filter behaviour and whether access is limited to the intended admin. Preserve it during the read-only audit; propose changes separately.
- Controlled reminder test on 29 July: submission and immediate acknowledgement delivery succeeded for Mike's Rockingham Chase test. The form/toast used confirmation language, but the supplied email showed no confirmation action; the form promised unsubscribe at any time, but no visible unsubscribe link appeared in the supplied content; and the form accepted a nominal one-week-before reminder on the displayed event date. Trace acknowledgement, confirmation, scheduled reminder and unsubscribe as separate states and verify reminder eligibility against occurrence date, entry state and an evidenced entry-closing date.
- Mike understood that no scheduled reminder sender was implemented. The 30 July repository audit instead found `send-race-reminders.ts` and migration `20260625202213_931fa52f-7aa8-4c21-a1de-a9dce88545d2.sql`, which schedules `send-race-reminders-daily` at 09:00 UTC. Reconcile production `cron.job`, run history, vault secret, HTTP responses, queue, provider and send logs. The endpoint appears to mark `reminder_sent_at` even after suppression or enqueue failure; verify this. Do not invoke, activate, disable or modify the job in Phase 0.
- Mike's temporary manual-fulfilment plan is suspended pending that reconciliation. Do not alter the form, send/backfill messages or manually fulfil a due request during Phase 0. Report the next potentially due rows in redacted form so an explicit operational decision can be made.
- `Entry Click`, automatic outbound tracking, search and organiser-acquisition event definitions and possible double counting.
- EA/SA manual and scheduled sync paths, logical run/chunk handling, source membership, material diffs, unchanged writes, partial failure and source-missing treatment.
- Existing support for stable organiser/series/occurrence identity, evidence, typed relationships, conflict states and source mappings.
- Admin authentication, authorisation and session behaviour.

## Recent GitHub/admin maintenance reconciliation

Mike reports that an inability to log in to admin and other general-maintenance defects were recently fixed through GitHub/project work. Identify the exact commits or changes currently present and report:

Repository: `MBLRENM26/run-near-me-app` (`https://github.com/MBLRENM26/run-near-me-app`).

Read `RENM-github-maintenance-audit-2026-07-30.md` as supplied evidence. The read-only GitHub review observed `main` at `94e3aa777ae541a6c49e10c8a0dad08c636a0100`; confirm whether production is deployed from this exact revision rather than assuming it.

- what the admin-login failure was;
- what changed to fix it;
- whether the deployed project contains that fix;
- what other maintenance fixes accompanied it;
- whether the admin-login or related maintenance changes caused, revealed or failed to resolve the missing-subscriber visibility problem;
- their verification evidence;
- any remaining risk or conflict with the new contracts.

Treat the following as a mandatory high-priority verification item: commit `7634dd32` removed the prior same-origin/CSRF helper and admin mutation checks, while commit `0f588039` later configured the HTTPS admin session cookie as `SameSite=None` for iframe use. Determine the effective protection on every current admin mutation and perform a non-destructive hostile-origin and missing-origin runtime check. Report this as confirmed, disproved or unresolved with evidence. Do not infer safety from the HMAC signature: cookie integrity and cross-site request authorization are separate concerns.

Also test that an unauthenticated or expired session is visibly distinguishable from a genuine zero-subscriber result. Current subscriber handlers at `94e3aa77` appear to return empty data when unauthenticated, which can mask another login/session failure.

Do not revert, repeat or replace these fixes merely because they predate the new context. If commit history or the relevant repository is not available, state that limitation and request the exact evidence needed.

## Output format

For each finding provide severity, observed behaviour, intended contract, evidence location, dependency, recommended future work package and rollback consideration. Separate confirmed findings from inference.

Finish with a proposed sequence of narrow work packages. Do not execute them.
