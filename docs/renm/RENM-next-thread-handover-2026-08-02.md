# RENM — next-thread handover

Date: 2 August 2026  
Purpose: begin the next work cycle from a verified operating baseline without reopening completed incident work.

## Current position

RENM remains live and continues to demonstrate occurrence-page traffic followed by outbound hand-offs. Runner demand for a return channel is now behavioural rather than hypothetical: 24 reminder requests are stored, including Mike's controlled test. This does not prove reminder fulfilment, return visits, entries or organiser value.

Urgent maintenance is contained and deployed at production commit `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`:

- full TypeScript check clean;
- 31 tests passing;
- production build passing;
- subscriber admin distinguishes expired authentication from empty data;
- admin navigation shows aggregate red unseen badges for new subscriber, race-submission and club-submission work;
- legacy subscriber rows were backfilled as seen;
- reminder cron job 6 is inactive;
- reminder HTTP sending is fail-closed with `503` unless explicitly enabled;
- no automated reminder emails were sent.

Do not reactivate or repair reminder automation incidentally. The live form remains unchanged under Mike's temporary decision to monitor and handle valid new requests manually.

## Strategic position

The demonstrated current product is trusted occurrence-intent resolution:

`Google/AI → RENM occurrence page → correct official/entry destination`

The next commercial validation is not a generic claim that directories create value. Mike will obtain RENM outbound-click evidence, resolve the appropriate organiser/contact roles, approach prospectable organisers and ask whether the traffic is noticed or valuable. If broad outreach produces no recognition, interest or testable value, park the organiser commercial thesis rather than building a portal around it.

The wider canonical organiser/series/occurrence and change-distribution concept remains plausible but unvalidated. Fragmentation explains the problem and cost; it does not establish willingness to participate, pay, integrate or treat RENM as authoritative.

## Next-thread objective

Move from incident containment to the trust rebuild and real-world validation. Do not implement a broad feature roadmap.

1. Define the organiser outreach evidence pack, contact/prospectability rules, interview questions and outcome log without exposing personal contact data in strategy documents.
2. Define manual monitoring and fulfilment controls for new reminder requests while automation remains disabled.
3. Turn Phase 1 into the smallest ordered Lovable work packages, beginning with read-only dependency checks where needed:
   - safe public event projection and base-table exposure;
   - one shared future/canonical discovery eligibility rule;
   - quarantine of test records and treatment of known duplicates;
   - destination validity, role and verification state;
   - source-run manifests, material-change reporting and non-destructive source-missing handling.
4. Decide which package to send to Lovable first, with migration, rollback, tests and production acceptance evidence.
5. Keep Kent and South London packages offline until staging/reconciliation exists.

## Explicit non-goals

- no automated reminder activation;
- no historic or bulk subscriber messaging;
- no organiser portal or universal `update once, publish everywhere` build;
- no regional-data production import;
- no new SEO inventory expansion;
- no repository-wide refactor;
- no claim that outbound clicks equal registrations or revenue.

## Opening prompt

I am continuing RENM from the 2 August 2026 containment baseline. Read `RENM-next-thread-handover-2026-08-02.md` first, then the current Project Knowledge, decision register, data/lifecycle contract and phased build brief. Treat historic Bibles and earlier incident assumptions as supporting history only.

The reminder cron is inactive and the HTTP sender is fail-closed. Twenty-four reminder requests are stored; the form remains live under temporary manual monitoring. Do not enable automation, message historic subscribers, import regional research data or build an organiser portal.

First, help me operationalise the organiser outbound-click validation and manual reminder-monitoring controls. Then convert Phase 1 trust work into narrowly scoped, reversible Lovable packages and recommend the first package for approval. Keep sourced facts, observed evidence and inference separate. Bring any implementation prompt back to me before sending it to Lovable.
