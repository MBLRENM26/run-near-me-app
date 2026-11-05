# Research monitor operations — 5 November 2026

The live review queue contains supporting evidence whose derived relationship decision is already applied. Count unfinished work without deleting, rejecting or rewriting that evidence. Preserve the existing raw count and the limit of 30.

## Controls and accounting

Install `drizzle/migrations/0004_research_monitor_controls.sql` before releasing the matching app. The read-only `research_monitor_controls(uuid[])` function is executable only by `service_role`. A STABLE function reads sources, raw pending/held count and verified support relationships from the same statement snapshot. No public fields, evidence, decisions or ORL rows change.

A support exclusion requires an exact pending `{"kind":"page_change"}` proposal, parseable acceptance note, applied derived club relationship, same source and matching event/club/organisation IDs, plus the reciprocal parent evidence UUID in the derived review note. Held rows, structured page research, absent/reverted decisions, mismatched identities and unverified website receipts remain counted. Invalid notes count as work.

Old signed GET controls remain version 1, using `${timestamp}.sources`, and return the raw `pending_review`. They fail with 503 when the complete catalogue exceeds 1,000 rows. A truncated response is never returned as complete. Existing policies never opt in implicitly.

A new policy can explicitly set `"review_counter":"verified_actionable_v1"`. Its worker requests `?version=2&sources=<sorted,unique,lowercase UUIDs joined by commas>` and signs `${timestamp}.sources.v2.${ids.join(",")}`. At most 30 IDs are allowed. V2 returns only the exact selected sources with `sources_complete:true`, `requested_source_ids`, raw `pending_review` and `review_workload:{version:1,raw_outstanding,verified_completed_support,actionable_review}`. One JSON-valued RPC avoids the table API row cap. Missing sources, unexpected IDs or inconsistent counters stop collection. The worker's local allowlist and slowest local/remote interval still apply. In pilot reports `review_counter` identifies which counter the `pending_review` guard uses; the report also retains `raw_pending_review` and the complete `review_workload`; the response always preserves the raw count.

## Structured intake

`researchEnvelope` remains the historical read schema. New HTTP and admin-file intake use `researchIntakeEnvelope`: page research needs structured extraction; an empty extraction needs explicit issues carried into conflicts; summaries are plain text and at most 400 characters. The worker validates new observations before inserting them into its immutable outbox. Historical deliveries are never silently rewritten. Existing non-page-change proposal kinds and human decision gates are unchanged.

## Rollout

1. Keep the expired collector disabled. Preserve its policy, exact completed marker, selected image, original six-source registry and a consistent SQLite snapshot. Keep secrets private and out of the repository.
2. Apply the additive function migration, then release this app version. Verify signed controls for the six-source allowlist and one selected source against the actual published URL; source push alone is not proof of deployment. Verify v2 reports current raw/workload counts, not historical expected constants. Legacy v1 may legitimately return 503 for the oversized catalogue.
3. Build the worker from this same revision and pin the immutable local image. Do not select the older prepared strict image: it lacks these v2 controls. Validate synthetic fixtures and signed rejection/replay in isolation, never by posting fixtures to production.
4. Create a fresh seven-day policy with real start/end times, `review_counter:verified_actionable_v1`, the exact hash of a one-source config for Great Bentley Half Marathon 2027 (`c84fa6ef-f8e3-5bd4-a720-4c1765ca3b90`) and its original 168-hour interval. Preserve the original six-source registry separately. Do not extend the old policy or erase its completion evidence.
5. Run a supervised first cycle: verify source/edition evidence, review-only intake, stable replay IDs, outbox acknowledgement, consistent backup and verified off-host transfer. The worker keeps 30-review/50-outbox, storage, source URL/robots/rate and 1 CPU/1 GiB limits. No automatic acceptance, public edits or new occurrences.
6. Enable only the bounded renewed schedule after those checks. One weekly source within seven days proves a first cycle, not continuous daily research. Stop at expiry and review before expansion.

## Rollback

Pause the renewed schedule first; retain all evidence and outbox files. Restore the checkpointed runtime descriptor and policy without reviving the expired pilot. App rollback can be independent: the new function is additive and read-only, so leave it installed while rolling back the route/worker; remove it only after nothing uses it. Do not restore public event data or delete research rows to roll back scheduling. Never bypass backlog pressure by raising the threshold.

## Validation

Run the worker unittest suite and app Vitest suite, type check and build. `scripts/research-monitor-controls-test.sql` exercises a synthetic 45-row baseline in an empty disposable PostgreSQL database and rolls its fixtures back. Run it with psql and ON_ERROR_STOP; its relative include loads the actual migration. It covers reversion, malformed notes, reciprocal provenance, identity mismatch, held/structured evidence, catalogue overflow and access grants. Never run test fixtures against production.
