# RENM — validation, reminder monitoring and Phase 1 package plan

Date: 2 August 2026  
Status: proposed operating plan and approval brief. No implementation, outreach or subscriber messaging is authorised by this document.

## 1. Evidence discipline

Every report, evidence pack and outcome log must label statements as one of:

- **Sourced fact:** supported by a named, reproducible source such as a Plausible export, database query, code commit, official occurrence page or organiser response. Record the source, observation time and owner.
- **Observed evidence:** what RENM or Mike directly observed in a defined period. State the event definition, population, exclusions and measurement limitations.
- **Inference or hypothesis:** an interpretation to test. Never restate it as organiser value, a registration, revenue or authority.

Current sourced baseline:

- Production containment is deployed at `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`; typecheck, 31 tests and the production build passed.
- Reminder cron job 6 is inactive and the HTTP sender is fail-closed unless explicitly enabled. No automated reminder emails were sent.
- Twenty-four reminder requests are stored, including Mike's controlled test. This is behavioural evidence of demand for a return channel, not evidence of consent quality, reminder fulfilment, return visits or entry.
- RENM has observed occurrence-page traffic followed by outbound hand-offs. An outbound click is not a registration, revenue or organiser value.

Governing sources: [next-thread handover](RENM-next-thread-handover-2026-08-02.md), [Project Knowledge](RENM-project-knowledge.md), [decision register](RENM-decision-register.md), [data/lifecycle contract](RENM-data-lifecycle-contract.md) and [phased build brief](RENM-phased-build-brief.md).

## 2. Organiser outbound-click validation

### 2.1 Validation question

For organisers whose occurrences received audited RENM outbound traffic, is that traffic recognised or useful enough for the organiser to correct a portfolio, return with a second real change, authorise a low-effort attribution/distribution test or express concrete willingness to pay?

The test is not whether organisers politely like directories or the general idea of cleaner data.

### 2.2 Cohort construction

Build the first cohort from occurrences with audited historical custom `Entry Click` evidence. Do not sum that series with Plausible automatic outbound events or the replacement `Outbound Click` series introduced at application head `9558063`. New observations use `Outbound Click` and its conservative analytics-only `destination_role`; historical figures remain labelled with their original event definition and limitations.

Stratify the reachable cohort rather than selecting only the largest accounts:

- independent organiser or race business;
- host club or charity-led occurrence;
- multi-occurrence portfolio;
- single occurrence;
- different entry providers and direct organiser destinations;
- meaningful traffic bands, including at least some smaller but clearly attributable occurrence samples.

Exclude Mike/RENM-controlled occurrences from independent-organiser validation. Record non-response and ineligible prospects so the result is not based only on friendly respondents.

### 2.3 Evidence pack

Create one versioned, read-only pack per prospect. It contains no personal contact details.

1. **Scope:** evidence-pack ID, organiser candidate ID, occurrence/series IDs, observation window and preparation date.
2. **Role map:** proposed owner/organiser, host club, race director, registration provider, timer and results operator, each with evidence status. Unknown remains unknown.
3. **Public portfolio:** current and relevant historic occurrences, canonical URLs, official-information and next-action destinations, and any visible conflicts or stale representations.
4. **Outbound evidence:** audited event definition, click count, unique converters where available, occurrence, destination role/domain, date range and exclusions.
5. **Destination check:** URL role, entry state, last checked time, working/redirect/failure result and whether the destination is event-specific.
6. **Limitations:** clicks do not prove booking start, registration, revenue, incrementality or organiser recognition. State internal/bot exclusions and instrumentation status.
7. **Requested validation:** factual corrections, role confirmation, whether the traffic is noticed/useful, the organiser's preferred destinations, and permission for a bounded follow-up test.

Do not include email addresses, named-person contact data, restriction notes or raw source/provenance in the pack. Keep those in a separate private operations store linked only by prospect ID.

### 2.4 Prospectability gate

A prospect is `eligible` only when all mandatory gates pass:

| Gate | Pass rule | Fail treatment |
|---|---|---|
| Relationship | The target has a supported operational, ownership, marketing, digital or race-management role relevant to the represented occurrences. | Resolve the role or exclude. Do not assume the booking provider is the organiser. |
| Organisational status | The intended electronic-mail subscriber is confirmed as a corporate body, or another compliant basis/channel has been documented. | Hold sole traders, unincorporated bodies and uncertain cases from unsolicited email pending a privacy review or prior request/consent. |
| Channel purpose | The route is intended for business, partnership, media, event or general organisational enquiries. | Exclude emergency, safeguarding, participant support, membership-only, personal social or explicit no-sales channels. |
| Relevance and necessity | RENM has occurrence-specific evidence and the named role is reasonably likely to care about accuracy, traffic or distribution. | Do not send generic directory promotion. |
| Transparency | RENM can identify itself, explain why the contact was selected, provide the relevant privacy information and state the limited purpose. | Hold until the required copy/process exists. |
| Objection screening | The organisation/person is not on RENM's do-not-contact or objection list and has not previously declined. | Suppress. Do not erase the minimum record needed to honour the objection. |
| Proportionality | Initial contact is one concise message; no sensitive data, enrichment beyond need or repeated chasing. | Exclude or reduce contact. |

Current ICO guidance distinguishes corporate subscribers from sole traders and some partnerships for unsolicited electronic mail. It also says UK GDPR still applies when personal data is used, requires a lawful basis and transparency, and requires identity plus a valid opt-out address. The guidance is under review following legislative change, so Mike should recheck it before launch and record the chosen lawful basis and privacy review. See the [ICO business-to-business marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/) and [electronic-mail compliance guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/). This plan is an operating screen, not legal advice.

Prospectability outcomes are `eligible`, `hold — status/basis unclear`, `hold — role unclear`, `ineligible — channel restriction`, `suppressed — objection` or `duplicate prospect`.

### 2.5 Interview guide

Use the same core questions in every completed conversation:

1. What is your role in this occurrence and which listed occurrences are actually part of your portfolio?
2. What in the read-only portfolio is wrong, missing, duplicated or stale?
3. Which organisation controls the date, venue and public instructions? Which provider controls entry availability?
4. Which destination should runners use today for official details, entry or waitlist, and how often does it change?
5. Before this approach, had you noticed RENM or traffic from it? What evidence would let you recognise useful traffic?
6. Are the observed hand-offs useful to you? If so, what outcome matters: qualified visits, booking starts, completed entries, fewer support questions or something else?
7. How do you currently update organiser, governing-body, entry, timer/results and directory records? Which change is most costly or most often wrong?
8. Will you make or confirm one correction now? Record the completed action, not only agreement.
9. If a second real change arises, will you send/confirm it through the agreed manual route without repeated chasing?
10. Would you authorise one bounded attribution or distribution test? Define destination, method, data minimisation, duration and success measure.
11. Is there a problem here you would pay to solve? Record the buyer, budget signal, timing and condition; do not convert general enthusiasm into willingness to pay.

### 2.6 Private outcome log

Keep the outcome log access-controlled. Strategy reporting uses prospect IDs and aggregates only.

Minimum fields:

- prospect ID, evidence-pack version, cohort/segment and relevant occurrence IDs;
- supported relationship roles and legal-form/subscriber classification;
- contact-route class, prospectability decision, decision reason and reviewer/date;
- outreach dates, response state and completed-conversation date;
- prior recognition of RENM: `yes`, `no`, `uncertain`, with evidence note;
- traffic value: `valuable`, `potentially valuable`, `not valuable`, `not measurable`, with organiser's stated measure;
- factual corrections proposed and corrections completed;
- portfolio claimed/confirmed date;
- second real update requested, due, completed and chasing count;
- attribution test and distribution test: proposed, authorised, started, completed, rejected;
- concrete willingness-to-pay state, buyer, condition and timing;
- objection/opt-out state and minimal suppression reference;
- final disposition: `continue`, `narrow`, `park`, `no decision`, plus reason and next review date.

Report the full funnel: eligible prospects → contacted → responses → completed conversations → corrected/claimed portfolios → second updates → authorised tests → completed tests → concrete willingness-to-pay signals. Keep non-response in the denominator and segment results by organiser type.

Initial interpretation uses the existing Phase 5A signals: approximately five corrected/claimed portfolios, three second updates, two authorised attribution/distribution tests and one concrete willingness-to-pay signal, interpreted against the reachable completed-conversation cohort. If broad, properly targeted outreach yields no recognition, meaningful correction, return behaviour or low-effort test authorisation, park the organiser commercial thesis rather than build a portal.

## 3. Manual reminder monitoring and fulfilment control

### 3.1 Operating boundary

- Cron job 6 stays inactive.
- `REMINDER_SENDING_ENABLED` stays disabled/absent so HTTP sending remains fail-closed.
- Do not repair scheduler authentication, run the sender endpoint or test it against real subscribers.
- Do not message, backfill, confirm, modify, suppress or delete the historic cohort in bulk.
- The public form remains unchanged under Mike's temporary decision.
- Manual handling is allowed only for a new request that passes every record-level gate below. A failed or unknown gate means `hold/no send`.

### 3.2 Monitoring cadence

On each working day, Mike checks the authenticated subscriber badge/view once and records:

- check time and authenticated/expired state;
- total stored count, new-unseen count and newest request time;
- whether each new row has been assigned a private case ID;
- any mismatch between badge, list and aggregate count;
- cron/sender containment exception only if directly observed.

At least weekly, perform a read-only containment check that job 6 remains inactive and the sender flag has not been intentionally enabled. Any active job, non-`503` unauthorised sender behaviour, unexplained send/attempt record, count decrease or subscriber/admin mismatch is an incident: stop manual fulfilment, preserve evidence and reconcile before proceeding.

Do not copy addresses into this document, analytics or strategy reporting.

### 3.3 Private case ledger

For each new request, record:

- case ID and internal subscription ID;
- created time, occurrence ID and form/copy version if recoverable;
- consent evidence and purpose actually presented;
- acknowledgement evidence separately from confirmation evidence;
- occurrence date/lifecycle and evidence checked time;
- entry state, verified entry/official destination and entry-closing evidence;
- calculated due window and calculation basis;
- unsubscribe route availability and suppression check;
- decision/status, reason code, reviewer and review time;
- if authorised and sent: message version, send time, provider acceptance/delivery/failure evidence;
- unsubscribe, suppression, bounce, complaint, return visit and next action where lawfully measurable.

Statuses: `new`, `reviewing`, `awaiting evidence`, `eligible — not due`, `due — final check`, `sent manually`, `failed`, `unfulfillable`, `expired`, `unsubscribed/suppressed` and `incident hold`.

### 3.4 Record-level send gate

A manual message may be sent only when all answers are `yes`:

1. Is this a new, individually reviewed request rather than historic/bulk treatment?
2. Is the exact consent purpose and submission evidence available and consistent with the proposed message?
3. Is the address not unsubscribed, suppressed, duplicated, controlled-test-only or under incident hold?
4. Is the occurrence identity canonical, future and not cancelled/terminal/duplicate/test?
5. Is the promised trigger evidenced? For the current closing-related copy, a verified event-specific entry-closing trigger is required; the event date alone is not a substitute.
6. Is the message due now rather than already missed or premature?
7. Are the entry state and event-specific next-action destination currently verified?
8. Is there an immediate, usable opt-out/unsubscribe route whose resulting suppression Mike can honour before any later contact?
9. Has Mike completed and timestamped the final check immediately before the send?
10. Can provider acceptance/failure be recorded without marking a failed attempt as sent?

If there is no verified closing trigger, do not silently turn the request into an event-date or entry-opening reminder. Mark it `awaiting evidence` or `unfulfillable`. If the usable unsubscribe/suppression path does not exist, send nothing.

### 3.5 Manual message constraints

Use a version-controlled transactional template limited to the requested occurrence and purpose. It must identify RENM, state the verified event/entry fact and check time, link only to the verified appropriate destination, avoid claiming that a click is an entry, and include the working opt-out route. Do not add promotion, unrelated races or an organiser-commercial message.

One eligible request produces at most one manual reminder for the present promise. A failed attempt is not `sent`; investigate before any retry and use a case-level idempotency reference.

### 3.6 Daily/weekly aggregate report

Report only counts: new, reviewing, eligible-not-due, due, sent, failed, awaiting evidence, unfulfillable/expired, unsubscribed/suppressed and incident holds. This process demonstrates operational handling only; it does not validate reminder fulfilment until delivery, return and verified next action are measured.

## 4. Narrow Phase 1 Lovable package register

Every package has its own approval, migration, rollback, tests and production evidence. Read-only inventories precede dependent mutations. No package may enable reminders, import Kent/South London data, expand SEO inventory or create an organiser portal.

### L1 — Read-only public-access dependency inventory

**Scope:** identify every client, server, function, view, API, admin path and job that reads base `events`; list selected columns, caller/auth mode, grants/RLS, cache/build-time use and safe-projection needs. Include current tests and gaps. Inspect only; change nothing.

**Output:** dependency matrix, current exposure statement, proposed safe public column set, private columns/gates to exclude, consumer migration order, grant-revocation preconditions, rollback design and production verification queries.

**Acceptance evidence:** commit/deployment/schema identifiers, complete search methods, database grant/RLS evidence, route list and explicit unknowns. No schema, code, data, configuration or job change.

### L2 — Read-only eligibility dependency inventory

**Scope:** identify every encoding of `ACTIVE`, dates/`sort_date`, canonical/duplicate state, counts, discovery, sitemap/indexing and direct-page reachability across home, distance, city, region, month, weekend, terrain, search, nearby and APIs. Inspect only.

**Output:** route/query matrix, disagreements, proposed interim predicate and affected-record/count preview. Keep countability, discoverability, indexability and direct-page reachability distinct.

**Acceptance evidence:** reproducible before-counts and sampled included/excluded IDs without public mutation.

### L3 — Safe public event projection

**Dependency:** L1 approved and reconciled.

**Migration:** create an explicitly column-listed shadow view/function or server API; deny private gates/columns by construction; add access regression tests; migrate consumers in a named order; verify each consumer; revoke anonymous/authenticated base-table SELECT only after zero required public dependencies remain.

**Rollback:** restore consumers to the prior route and grants using a recorded script while retaining the unused projection. Do not drop data or columns.

**Required tests:** anonymous public fields work; private provenance/moderation/non-public gates do not; authenticated public role gains no extra base access; occurrence pages and outbound actions remain functional; admin remains authenticated and separate.

**Production evidence:** before/after grants, consumer smoke matrix, anonymous negative-column tests, error logs and deployed commit/migration IDs.

### L4 — Shared interim future/canonical eligibility shadow

**Dependencies:** L2 and a stable public read boundary from L3.

**Migration:** implement one named, versioned predicate in a shadow view/function. At minimum it must require canonical identity, a confirmed date on/after the agreed UK `today` boundary, no cancellation/terminal/test/duplicate quarantine and the approved interim discovery state. First compare old/new membership; then migrate surfaces consumer by consumer. Change count wording and predicate together only after reconciliation.

**Rollback:** switch consumers to the prior eligibility definition; preserve shadow results and reason codes.

**Required tests:** all named surfaces agree; no past, undated, duplicate or test record enters current discovery/counts/sitemap; direct/reference-page treatment is tested separately; timezone boundary cases are fixed fixtures.

**Production evidence:** before/after set differences and counts, sampled exclusions with reason codes, surface smoke matrix, sitemap check and deployed identifiers.

### L5A — Test-record quarantine preview and execution

**Dependency:** L2 establishes all surfaces; confirm whether exact `Test` and `TEST3` rows support any production fixture.

**Migration:** produce a zero-mutation preview, then in a separately approved step assign both records to reversible G0/admin-only treatment. Search for other test-pattern/default-coordinate suspects but quarantine only explicitly approved IDs.

**Rollback:** restore prior gate/status values from a captured before-image. Never delete records or evidence.

**Tests/evidence:** exact IDs absent from every public route/count/sitemap and retained in authenticated administration; no other row changed.

### L5B — Known duplicate treatment, one reviewed batch

**Dependency:** L2 inventory plus traffic/backlink and intent review for each public URL.

**Migration:** for a named, small batch, retain evidence/source identities; select one canonical occurrence; redirect a duplicate URL only where intent matches, otherwise retain a noindex/reference treatment. Record canonical mapping and reason.

**Rollback:** restore prior routing/visibility from per-record before-images. Never delete evidence or bulk auto-merge.

**Tests/evidence:** one occurrence in discovery/counts, intended legacy URL response, no redirect loop, destination continuity and per-ID before/after report.

### L6A — Read-only destination integrity census

**Scope:** inventory all fields and code paths currently used as source, organiser/official-information or entry destinations; identify invalid/non-absolute URLs, generic provider homepages, redirects/failures, role collapse and missing verification times. No CTA or data change.

**Output:** aggregate defect classes, sampled IDs, proposed controlled roles/states, dependency map and additive migration design. Keep raw source URLs private.

### L6B — Additive destination state and verification shadow

**Dependency:** L6A approved.

**Migration:** add typed destination role (`entry` remains the stored role), provider/domain, designation evidence reference, last verified time, observed entry state, redirect/HTTP result, confidence and recheck due time in an additive structure; backfill only mechanically provable values and leave unknowns explicit. Do not change current CTA selection yet.

**Rollback:** stop writing/reading the additive structure; leave legacy fields untouched.

**Tests/evidence:** invalid and generic URLs cannot become verified entry destinations; URL presence alone cannot set `open`; raw provenance stays private; sample before/after reconciliation.

### L6C — Verified next-action selection

**Dependency:** L6B has been populated and sampled to an approved accuracy threshold.

**Migration:** choose `Enter now`, waitlist, official information or honest unavailable treatment from verified role plus state. Observe first, then switch a bounded cohort before broad rollout.

**Rollback:** feature switch to prior CTA logic without discarding observations.

**Tests/evidence:** `Enter now` is impossible without verified-open state and an appropriate working event-specific destination; existing valid outbound instrumentation remains intact.

### L7A — Read-only source-sync dependency and fixture audit

**Scope:** map EA/SA triggers, parsers, chunking, run logs, upserts, publication effects, source identities and cron/manual paths. Capture sanitised 24 July fixtures and current count semantics. Do not run or change syncs.

### L7B — Additive logical-run and source manifest

**Dependency:** L7A approved.

**Migration:** add logical parent run, expected/completed chunks, trigger/source/parser version, coverage, state, source-identity manifest and canonical match. Existing discovery remains unchanged.

**Rollback:** disable new writes/read paths; retain additive audit rows. Do not alter or delete occurrence history.

**Tests/evidence:** all chunks reconcile to one logical result; failed/missing chunk means `partial`; identical rerun membership is reproducible.

### L7C — Material-change classification and gate-impact report

**Dependency:** L7B.

**Migration:** separate processed-existing, unchanged, materially changed and inserted; store field-level before/after evidence and proposed public-gate effect. New/materially changed weak records create review reasons rather than silent trust promotion.

**Rollback:** reporting-only switch to legacy metrics; no destructive reversal.

**Tests/evidence:** 24 July SA/EA fixtures reproduce one material existing change each rather than 93/421 misleading updates; malformed/generic destinations and material date changes appear in review output.

### L7D — Non-destructive source-missing observation

**Dependency:** L7B proves complete-run coverage and L7C classifies effects.

**Migration:** on a complete successful run only, create reversible `source_missing` observations/recheck work. No deletion and no immediate discovery demotion. Define grace/demotion policy later from observed evidence.

**Rollback:** stop generating missing observations; existing occurrence state remains untouched.

**Tests/evidence:** complete fixture omission creates one review observation; partial run creates none; reappearance resolves/supersedes review without erasing history.

## 5. Recommended first Lovable package

Approve **L1 — Read-only public-access dependency inventory** first.

Reasoned inference:

- It addresses the highest-impact privacy boundary without changing production.
- The data/lifecycle contract explicitly requires confirming every direct `events` reader before grant revocation.
- Its result is a hard dependency for a safe projection, migration order, rollback and regression suite.
- It is smaller than combining access and eligibility in one audit, so omissions and acceptance are easier to judge.
- L2 can follow immediately and may be commissioned separately before L3 implementation; no mutation should be approved until both inventories are reconciled where their consumers overlap.

## 6. Draft Lovable prompt for Mike's review — do not send

> Use the installed current RENM Project Knowledge, decision register, data/lifecycle contract and phased build brief. Production baseline is commit `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`.
>
> Perform **L1: a read-only public-access dependency inventory for the base `events` table**. Make no code, schema, data, grant/RLS, configuration, secret, scheduled-job, admin, UI or deployment change. Do not run reminder sending or ingestion. Do not import any regional research package.
>
> Identify every frontend, server, edge/function, database view/function, API, admin path, build-time path, cache and scheduled/manual process that reads `events` directly or indirectly. For each consumer report: file/object/query identifier, selected columns, filtering logic, caller and auth role, public versus admin purpose, RLS/grant path, runtime/build-time behaviour, and whether it can migrate to a safe public projection. Trace dynamic/generated queries and state any search limitation or unresolved path explicitly.
>
> Report the current anonymous and authenticated grants/RLS policies on `events` and any dependent objects. List the minimum public fields actually required by existing public consumers. Separately list private/prohibited fields and non-public gates that the safe projection must exclude. Do not expose personal data, raw private provenance or secrets in the report.
>
> Return:
>
> 1. baseline commit, deployed commit/schema/migration identifiers where observable;
> 2. complete dependency matrix;
> 3. current public-exposure statement with evidence;
> 4. proposed explicitly column-listed safe projection boundary;
> 5. consumer-by-consumer migration order;
> 6. grant-revocation preconditions;
> 7. proposed automated and production acceptance tests, including anonymous negative-access tests;
> 8. reversible rollback design;
> 9. conflicts, unknowns and decisions required from Mike.
>
> Stop after the report. Do not implement the projection, migrate consumers or revoke any access. Separate sourced repository/database facts, observed runtime evidence and inference.

Mike must approve or amend this prompt before it is sent to Lovable.
