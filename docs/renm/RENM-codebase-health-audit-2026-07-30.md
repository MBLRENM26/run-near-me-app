# RENM — codebase health audit

Date: 30 July 2026  
Basis: read-only inspection of public repository `MBLRENM26/run-near-me-app` at `94e3aa777ae541a6c49e10c8a0dad08c636a0100`.

## Immediate operational conflict: reminder automation exists in source and migrations

The repository contains both:

- `src/routes/api/public/hooks/send-race-reminders.ts`, a sender endpoint described as a daily cron target; and
- migration `20260625202213_931fa52f-7aa8-4c21-a1de-a9dce88545d2.sql`, which schedules `send-race-reminders-daily` for 09:00 UTC against the Lovable project URL using the vault `import_secret`.

No later migration unschedules that named job. This disproves the documentation statement that no sender was implemented. It does **not** prove the job is currently enabled, authenticated or successfully executing in production; production `cron.job`, `cron.job_run_details`, vault, HTTP and email-queue evidence is still required.

The endpoint selects every unsent `reminder` whose linked event is `ACTIVE` and whose `sort_date` is exactly seven days away. It does not use a verified entry-closing date or entry state. It then writes `reminder_sent_at` even when the recipient is suppressed or the email queue operation fails. This can permanently conceal failed fulfilment and conflicts with the lifecycle contract.

Immediate read-only check: establish whether the job exists/active and whether any subscriber will become due before a decision is made. Do not manually send on top of an active automated path.

## Other high-priority findings

### Public reminder capture can be abused

`subscribeToRaceReminder` has email and UUID validation and a database uniqueness constraint, but no effective IP/email rate limit, bot control or ownership confirmation. It sends an immediate email to any supplied address. An attacker can cause repeated mail by pairing an address with different event IDs. The source comment incorrectly describes validation and uniqueness as anti-abuse protection.

The acknowledgement is not double opt-in: the row becomes eligible without the recipient clicking a confirmation action. Its template does not visibly render an unsubscribe link, although the email queue receives an unsubscribe token; provider/header behaviour must be verified.

### Admin route guarding is fragmented

The admin shell itself has no route-level session guard. Individual server functions generally check the signed session, but unauthenticated functions sometimes return empty results. This creates confusing partial admin screens and makes omission of a function-level check dangerous. Consolidate authentication and cross-origin protection into shared server middleware after the current runtime audit.

### Sensitive logging

The unsubscribe route logs the raw unsubscribe token when a database update fails. Tokens are credentials and should never appear in logs. `notify.server.ts` also logs a full email address when unsubscribe-token upsert fails. Replace with redacted or non-identifying structured fields.

### Destructive operational endpoint

`/api/public/admin/fix-event-urls` is secret-protected but performs live external probes and nulls entry URLs on timeout, network failure, 404, 410 or 5xx. A temporary outage or deployment egress problem can therefore destroy useful destination data. It also contains hard-coded event fixes. Convert this pattern to observe/report/candidate-review/apply, retaining previous value, evidence and rollback.

## Engineering-health findings

- Only one test file was found, covering part of the Scottish Athletics import planner. Reminder lifecycle, admin auth/CSRF, eligibility, indexability, public projections, imports, duplicate merging and email queue behaviour lack visible automated regression coverage.
- Recent changes land directly on `main`; the observed head has no GitHub status checks or PR workflow evidence.
- Service-role access is widespread across public read functions. That is not automatically unsafe on the server, but it bypasses RLS and makes every query responsible for the public projection and eligibility contract.
- Important logic is duplicated across many route/server functions: `ACTIVE`, date eligibility, distance/region selection, admin authorization and error handling. Centralise contracts incrementally, beginning with public eligibility and admin security—not a broad cosmetic rewrite.
- `any` and type coercions are concentrated around Supabase/email code, weakening confidence that generated database types match deployed schema.
- Migration history contains repeated email-infrastructure migrations. Verify applied migration history and consolidate only through a forward migration plan; do not rewrite applied history.

## Refactoring order

1. Reconcile and contain reminder execution state.
2. Verify/fix admin CSRF and route-level authentication behaviour.
3. Add a minimal CI gate: typecheck, build, lint and tests on pull requests.
4. Add regression tests for reminder eligibility/failure states and admin access.
5. Introduce one shared public-eligibility projection/query contract.
6. Replace destructive URL repair with evidence-preserving review workflow.
7. Reduce `any`, duplicated queries and oversized admin modules as touched by approved work packages.

Do not undertake a repository-wide refactor before the trust-critical behaviours are contained and characterised.

