# RENM — Phased Build Brief for Approval

Status: sequencing contract under the approved 120–150 day product reset of 7 August 2026. Earlier phases remain preserved as supporting packages; the PX sequence below controls new implementation.

## Product-direction checkpoint — 7 August 2026

Mike identified that RENM's current experience is too flat, transactional and thin relative to the value latent in its catalogue. RENM will not be abandoned or expanded indiscriminately. It will run as a bounded product experiment: contract, rectify and synchronise the data; present it through an interactive Race Explorer; grow it through authorised direct data; distribute data-led content; and make a continue/narrow/stop decision from fixed signals after 120–150 days.

L3B-5B and the previous implementation sequence are paused, not cancelled. Existing indexable landing and occurrence pages remain the acquisition layer. The strategic wedge is trusted UK race intelligence: canonical series/editions/races, comparable course and practical data, authoritative destinations, source freshness and post-event results resolution. The governing product package is `RENM-interactive-race-explorer-product-reset-2026-08-07.md`.

Revised immediate sequence:

1. **PX0 — reset and preflight:** update canon; re-verify app/production/analytics state; inventory source and data defects; prepare the partnership brief. Documentation and read-only preparation only.
2. **PX1 — contract and rectify:** implement the canonical series/edition/race/result/source contract and synchronisation repairs through separately approved packages; fix the evidence baseline.
3. **PX2 — Explorer vertical slice:** ship one feature-flagged mobile-first discovery, comparison and event-intelligence journey while retaining existing SEO routes.
4. **PX3 — direct-data/results pilots:** prove one governing/registration feed, one timing/results route and a small organiser GPX/course cohort before general integration.
5. **PX4 — distribution and return:** run tracked, data-led search/social/video campaigns and test shortlist/return behaviour.
6. **PX5 — decision gate:** at day 120–150, continue, narrow or stop major investment without moving the evidence threshold retrospectively.

No application, schema, production-data, external-integration or deployment mutation is authorised merely by this checkpoint. Each package still requires scope, migration/rollback where applicable, tests, measurement and Mike's approval.

### Partner order for PX1–PX3

1. England Athletics RunEvents: stable identity, licence/status change feed, official destinations, result continuity and permitted display/storage terms.
2. One registration marketplace/provider: structured edition/race/location/price/entry data and attributable deep links under written terms.
3. One timing/results provider: official result-set state, semantics, corrections and permitted aggregates.
4. Ten to twenty organisers/clubs: authoritative GPX/course, facilities, cut-offs, accessibility and local corrections.
5. Garmin after route provenance is reliable; Strava only for runner-authorised enrichment/distribution. Neither is the canonical catalogue source.

### PX5 provisional continuation evidence

- Approximately three times the current monthly visitor baseline, or a sustained equivalent trajectory.
- Improving organic clicks and deep-page landings across two consecutive months.
- Repeat usage, saved/return behaviour or authoritative post-event results demand.
- At least one authorised automated source and two useful partner/organiser pilots.
- High scoped-inventory freshness with low unresolved duplicate/conflict rates.
- Attributable official-information, registration or results activations reported with their limitations.

Weak combined evidence stops major investment. A low-cost pet project may remain live, while packaging, licensing, sale or open-source release of selected components requires its own decision.

### Platform portability and graduation

Lovable remains RENM's validation/incubation platform during the evidence window. GitHub is the application and documentation source of truth; database migrations, exports, source adapters, core rules, analytics definitions and deployment dependencies must remain reproducible and portable. No pre-emptive migration is authorised.

At PX5, a strong continuation signal triggers a platform-fit assessment, not an automatic full rewrite. Graduate only where sustained traffic, automated feeds/background jobs, SSR/SEO or performance requirements, CI/CD/observability/security needs, or material cost/deployment constraints justify it. Moving frontend/hosting while retaining Supabase/Postgres is a valid staged outcome.

## Operational checkpoint — 2 August 2026

Phase 0 has been installed in Lovable. Urgent containment and admin observability work has also shipped as narrowly approved maintenance. Production baseline commit: `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`.

- Reminder cron job 6 is inactive and the sender HTTP endpoint is fail-closed unless an explicit enable flag equals `true`; no reminder emails were sent by the failed cron history.
- Twenty-four reminder requests remain stored. The public form remains unchanged under Mike's temporary manual-monitoring decision; this is not approval for automated or bulk fulfilment.
- Admin subscriber authentication failure is explicit rather than rendering as zero rows.
- Aggregate unseen badges now identify new subscriber, race-submission and club-submission work without sending admin email. Existing subscriber rows were backfilled as seen.
- Full typecheck is clean, 31 tests pass and the production build succeeds.
- These repairs create a safe operating baseline; they do not complete Phase 1 data/publication trust work or validate the organiser/distribution commercial thesis.

The next implementation sequence is now:

1. Preserve the containment baseline and manually monitor new work.
2. Run the outbound-click organiser validation and record responses/outcomes privately.
3. Specify Phase 1 trust work as small packages: safe public projection, shared eligibility, test/duplicate containment, destination verification and source-run observability.
4. Keep automated reminders disabled until Phase 3B's lifecycle and affected-record decisions are approved.
5. Do not build an organiser portal, broad syndication layer or regional bulk import before manual validation and staging/reconciliation gates.

## Context-reset checkpoint — 25 July 2026

Phase 1C’s file/staging research contract has now been proven through two regional pilots, but it is not implemented in Lovable or production.

- Kent & Medway has an independently accepted final candidate package after collision review, entry-state verification, stable-ID restoration, mapping-target reconciliation and vocabulary normalisation.
- South London has an independently accepted corrected candidate package but still requires entry-state verification and review of two inaccessible high-confidence evidence items before equivalent enrichment.
- The pilots remain offline candidate sources. Their entities must be reconciled with the live RENM database; they must not be bulk imported.
- The pilot exposed required validator rules that now belong in the eventual product: stable identifiers, mapping-target integrity, typed relationship-object integrity, controlled destinations/accessibility, evidence-to-edge deduplication and explicit residual uncertainty.
- No Lovable phase is authorised yet. First complete the runner-problem/market synthesis and revise the strategic priority order. Then install Project Knowledge as a context-only Phase 0 operation and request Lovable’s conflict/gap report before code or database changes.

The immediate post-synthesis sequence is:

1. Approve the strategic conclusions and any resulting amendments to these documents.
2. Send Lovable Phase 0 only: install Project Knowledge and return a conflict/gap report, with no code or database mutation.
3. Reconcile that report here and freeze the first implementation work packages.
4. Begin urgent safety/public-eligibility repairs and ingestion observability in reversible phases.
5. Build a production staging/reconciliation path capable of consuming accepted candidate packages without bypassing G0–G4.

## Strategic objective

Build the most reliable system for resolving UK race identity, state and next action; distribute it through search, AI, RENM discovery and approved partners; then monetise verified routing, organiser workflow and intelligence without compromising neutrality.

The presently demonstrated journey is primarily:

`Google/AI → RENM occurrence page → verified external entry or official destination`

RENM's own discovery experience, organiser product and machine-data business remain hypotheses to validate rather than assumed product-market fit.

## Delivery rule

Each phase is separately approved, implemented, verified and observed before the next begins. Lovable receives only the relevant phase plus approved Project Knowledge. Every production phase includes dependencies, migration, rollback, measurement and acceptance evidence. Records are preserved unless an approved policy explicitly requires deletion.

## Phase 0 — Install the context control plane

Goal: stop context loss before further product work.

This phase is read-only apart from installing the approved context documents themselves. Lovable must make no code, schema, data, configuration, scheduled-job or user-interface change.

Work:

- Approve and install the concise Project Knowledge kernel in Lovable.
- Store the data/lifecycle contract and decision register in a versioned canonical location.
- Label both Google Bibles “Historical context — not current master specification”; preserve them unchanged.
- Create a change template: objective, doctrine touched, scope, data impact, privacy/security, migration, rollback, measures and acceptance.
- Record current schema/code commit and dated audit/analytics baselines.
- Ask Lovable for a conflict and implementation-gap report only; no code/database change.

Acceptance:

- Mike, Codex and Lovable have one declared context authority order.
- Conflicting instructions produce a visible question rather than silent merging.
- Historic documents remain searchable but do not compete with the current contract.

## Phase 1 — Contain immediate trust and privacy defects

Goal: remove public trust failures before driving more runners through the routing layer.

Work packages:

1. Quarantine the two production test occurrences; inspect other test-pattern names and suspicious/default coordinates.
2. Create and test a safe public event projection, migrate consumers, then revoke anonymous/authenticated SELECT on base `events`.
3. Correct public count definitions and wording under an explicit interim future/canonical rule.
4. Remove past and undated occurrences from current discovery and sitemap paths through one shared eligibility layer.
5. Resolve known public duplicate occurrences, canonical URLs and redirects without deleting evidence.

Required tests:

- Anonymous users cannot read private provenance/moderation fields or non-public gates.
- Home, distance, city, region, month, weekend, terrain, search, nearby, sitemap and APIs agree on interim eligibility.
- No test, past, unknown-date or duplicate occurrence enters ordinary current discovery or counts.
- Existing valid occurrence pages, destinations, Plausible events and outbound actions still work.

Rollback:

- Shadow view/function and consumer-by-consumer migration before grant revocation.
- Reversible eligibility definition or server-side switch.
- Preserve records, evidence and URL mappings.

## Phase 1B — Make governing-body syncs observable and non-destructive

Goal: make current-source accuracy measurable before rebuilding or relying on the EA/SA cron schedule.

Why this moved forward:

- The supervised Scottish Athletics sync on 24 July 2026 reported 93 existing records updated, but a full before/after comparison found only one material field change and 92 identical upserts.
- The eligible source count fell from 110 to 105 without identifying or reviewing the five-record difference. Retained rows remained unchanged, so `ACTIVE` cannot currently prove continuing source presence.
- England Athletics is chunked into multiple independent run logs and therefore also needs logical parent-run reconciliation.
- The supervised EA run on 24 July confirmed the same metric problem: 421 existing rows were labelled updated, but only one changed materially. It also inserted 18 rows directly as `ACTIVE`, all without organiser identity; malformed and overly generic entry destinations passed through without quarantine.

Work:

- Introduce a logical sync-run parent with trigger mode, source, parser/code version, coverage window, expected/completed chunks and overall success/partial state.
- Persist per-run source observations linking external identity to canonical occurrence, with `first_seen_at`, `last_seen_at`, `last_seen_run_id` and `last_material_change_at` or an equivalent append-only observation model.
- Report fetched, eligible, processed existing, materially changed, inserted, unchanged, duplicate, quarantined, source-missing and failed separately.
- Store field-level change evidence for material changes and whether they alter discovery/public gates.
- Put new and materially changed source records through the approved completion/publication gate. Invalid absolute URLs, generic provider homepages, missing organiser identity and material date changes create review reasons rather than silently trusted public claims.
- On absence from a complete successful run, create reversible `source_missing`/recheck work. Never infer absence from a partial run and never auto-delete historical occurrences.
- Define a measured grace/recheck policy by event timing and source behaviour before source-missing records can be demoted from ordinary discovery.
- Rebuild scheduled EA/SA cron execution only after the same path is used by manual runs and can be reconciled end to end.

Acceptance:

- A repeat run with identical source data reports records as unchanged rather than materially updated.
- Mike can identify exactly which source identities appeared, changed or disappeared and which public records/gates were affected.
- All EA chunks reconcile to one logical result; missing or failed chunks yield `partial`, not a misleading success.
- A disappeared feed item creates review evidence without deletion; a partial run creates no false absence.
- The existing 24 July SA result and the supervised EA test are retained as regression fixtures/baselines.

Rollback:

- Additive observation/logging schema first; do not alter discovery gates until observed runs validate the policy.
- Keep current manual trigger available while cron behaviour is verified.

## Phase 1C — Install the research-intake and reconciliation contract

Goal: prevent useful regional/social research from becoming a second uncontrolled ingestion path.

Why this is required:

- The Kent pilot found valuable roles and portfolios but included duplicate organiser identity, unresolved organiser references and no supplied evidence ledger.
- South London retained 161 evidence observations with clean foreign keys, but its 151 relationship rows represented only 125 unique edges, free-form states diverged from Kent, two cross-region organisations received different IDs and parkrun evidence volume distorted the shortlist.
- The live database already contains 4,917 organiser-missing records with retained link clues and 41 Facebook references; external research must reconcile with these observations rather than create parallel entities.

Work:

- Define global stable IDs and an alias/candidate identity registry shared by syncs, regional research and manual review.
- Define distinct schemas for organisation, identity endpoint, programme, series, occurrence, venue, destination, relationship edge and evidence observation.
- Approve controlled enums for lifecycle, confirmation/date state, entry state, relationship role, source class, evidence access and confidence.
- Build a deterministic read-only validator for unique IDs, foreign keys, evidence references, unique edges, valid dates/URLs, enum membership and gate eligibility.
- Make relationship edges unique by entity pair, role and validity period; attach multiple evidence observations to the edge.
- Reconcile candidate endpoints, aliases and portfolios against the current RENM clue snapshot before proposing new canonical entities.
- Segment parkrun and other recurring networks from entry-based race inventory for counts, recurrence and verification priority.
- Define a separate manual Facebook/social queue recording accessibility, control evidence, role, currency and cross-links without collecting member data.
- Apply one correction-round contract to both Kent and South London before any import or further regional commission.

Acceptance:

- Both corrected pilots pass the same machine-readable schema and validator with zero broken references or duplicate edges.
- Repeated evidence increases support for one edge rather than increasing relationship or portfolio counts.
- Cross-region organisations resolve to the same canonical ID or an explicit unresolved merge candidate.
- A schedule string cannot occupy an occurrence-date field, and a URL cannot imply `entry open` without observed state evidence.
- Network segmentation prevents parkrun volume from dominating entry-race priorities.
- The reconciliation report shows matched live events, proposed new identities, conflicts, untouched raw evidence and proposed public-gate effects; no public mutation occurs.

Rollback:

- Intake remains file/staging based and additive. Rejecting a package changes no production data.
- Preserve original Kent/South London files as immutable research evidence and regenerate corrected derivatives.

## Phase 2 — Establish measurement integrity

Goal: make commercial and product decisions from trustworthy events rather than pageview inference.

Critical incident input — 29 July 2026: a quick admin interface exposed 23 stored reminder rows across 17 events, dated 25 June–29 July. One is Mike's controlled row; 22 appear external across 16 events. All displayed `Reminder sent` values are blank. Phase 0 must reconcile the authoritative consent, confirmation, notification and delivery states and review the new interface's query and access controls. Any containment or messaging requires separate approval.

Work:

- Treat the historical `Entry Click` series as closed at application head `9558063`; verify that the replacement `Outbound Click` fires only on deliberate activation of a rendered outbound event-detail CTA.
- Document that Plausible automatic `Outbound Link: Click`, historical `Entry Click` and current `Outbound Click` can describe overlapping actions; never sum or splice the series.
- Validate existing event properties. `destination_role` is now emitted conservatively for analytics; add organiser, series, entry state, provider, gate, verification-age bucket and experiment/campaign ID only where appropriate and evidence-backed.
- Replace ambiguous automatic-form reliance with explicit Reminder Started/Confirmed/Sent/Clicked, Search Results Shown/Zero/Clicked, Organiser Portfolio Viewed, Claim Started/Submitted and Correction Submitted events.
- Verify the exact steps behind Search Performed and Organiser Acquisition funnels.
- Establish saved Plausible segments excluding Lovable/internal activity and document bot-filtering differences from Lovable analytics.
- Define `Successfully Resolved Intent` reporting across entry, waitlist, information, reminder and closure outcomes.

Acceptance:

- A manual test occurrence/action produces exactly the expected custom events and properties.
- `Outbound Click` has no render or automatic-navigation false positives, and no outbound activation is described as a completed entry.
- Reminders, search and organiser actions are independently measurable.
- A reproducible 28-day baseline report can be generated without manual interpretation.

## Phase 3 — Build entry-state and destination intelligence

Goal: strengthen the runner action already showing value.

Work:

- Introduce typed destination roles: authority evidence, official information, entry, waitlist and organiser context.
- Add explicit entry state: open, opening soon, waitlist, sold out, closed, cancelled and unknown.
- Record provider/domain, designation evidence, checked time, redirect/HTTP outcome, confidence and recheck due time.
- Select CTA from verified state: Enter now, Join waitlist, Official details, Remind me or clear closed/cancelled treatment.
- Add broken/redirected destination detection and a review queue; begin with observation before automatic demotion.
- Keep organiser identity separate from booking-provider identity.

Acceptance:

- `Enter now` cannot appear without a verified-open state and appropriate destination.
- A G3/G4 event may remain discoverable before entries open, with honest treatment.
- Sample audits across organiser sites, Eventrac, SiEntries, RaceBest, EntryCentral, Sport:80, JustGo, Enthuse and governing records pass the agreed accuracy threshold.
- Destination failure/change creates review work without erasing historical evidence.

## Phase 3B — Fulfil the validated reminder promise safely

Goal: implement the smallest auditable reminder lifecycle now that real runner demand exists.

Dependency: complete the subscriber incident audit, trustworthy measurement foundations and enough entry-state/destination intelligence to define a truthful trigger. No broad alert product is authorised.

Interim operation approved by Mike: leave the current form unchanged, monitor new requests and respond manually where appropriate. Do not bulk-send or backfill existing rows. The manual process should record a redacted/internal subscription identifier, verified trigger evidence, decision, send time/provider outcome and unsubscribe/suppression state.

Work:

- Reconcile every existing reminder row against occurrence date, lifecycle, entry state, evidenced entry-closing/opening information, acknowledgement history and consent evidence.
- Define separate stored, acknowledgement-attempted/delivered, confirmation-required/confirmed, reminder-eligible/scheduled/attempted/delivered/failed and unsubscribed/suppressed states.
- Decide the honest initial reminder contract: evidenced entry-closing reminder, entry-opening reminder or event-date reminder; do not infer one from another.
- Stop accepting requests that are already past the valid scheduling point, or present an honest alternative before submission.
- Include an immediate working unsubscribe route and suppression enforcement in every relevant message.
- Use an idempotent, observable sender; record success only after provider acceptance and retain delivery/bounce/suppression outcomes where available.
- Run controlled internal tests before any real subscriber delivery.
- Prepare a record-level proposed treatment for the existing external rows: eligible future fulfilment, expired/unfulfillable, ambiguous/manual review or suppressed. Any messaging to existing subscribers requires separate approval.
- Measure delivered reminder to return visit and verified next action without exposing addresses in analytics.

Acceptance:

- No real message is sent without a supported purpose, eligible trigger, consent evidence and unsubscribe/suppression path.
- Retry cannot create duplicate sends.
- Admin counts reconcile stored requests through acknowledgement, eligibility, delivery and suppression.
- Mike can see what is due, why, what happened and what failed without accessing raw provider logs.
- The pilot produces evidence about return and next-action behaviour before broader change/date/cancellation alerts are built.

## Phase 4 — Build the gate engine and repair queues

Goal: make trust rules explicit, measurable and shared across every surface.

Work:

- Add/derive lifecycle, visibility gate, date state, canonical state, verification, coordinate precision, entry state and destination state.
- Compute proposed gates in a shadow view/table with reason codes before overwriting current status.
- Create admin queues for unknown/conflicting dates, duplicates, invalid/imprecise coordinates, missing official information, stale/failed destination, unclear organiser and state changes.
- Show evidence, reasons and suggested next action to Mike.
- Add constraints/checks only after real-data observation.
- Remove the redundant norm-id index if reconfirmed.

Acceptance:

- Every record has a deterministic proposed gate and reason codes.
- Stored → canonical → future → G2/G3/G4 → enterable-now counts reconcile.
- Samples from every gate/state are manually reviewed and error rates recorded.
- No promotion depends on guessed facts.

## Phase 5A — Run organiser discovery and portfolio validation

Goal: determine whether organisers value RENM's resolved identity/portfolio before building a portal.

This validation track can run alongside founder-event experiment design; it does not need to delay a controlled RENM-owned event launch.

Work:

- Begin with organisers represented in audited outbound traffic, then sample clubs, independents, multi-race businesses, festivals and different booking providers.
- Resolve organiser, owner, host club, race director, registration provider, timer and results-operator roles without assuming the first public contact is the organiser.
- Assess whether each public contact route is suitable for this outreach; exclude explicit no-sales channels and retain prospectability privately.
- Prepare a read-only reconstructed portfolio showing series, occurrences, historic continuity, public destinations, role assignments, conflicts and stale representations.
- Present outbound evidence conservatively only after Phase 2 confirms the measurement; state explicitly that clicks are not registrations.
- Ask organisers to correct or claim the portfolio and identify which facts and downstream destinations they actually maintain.
- Produce a manual distribution manifest showing what can be updated automatically, by authorised integration, by organiser action or not at all.
- Ask participants to complete a second real change without repeated chasing; measure return behaviour separately from stated interest.
- Seek an authorised attribution or distribution pilot, and record willingness to maintain, introduce a platform partner or pay as separate outcomes.

Acceptance:

- Relationship accuracy and correction categories are quantified.
- At least one organiser problem is supported repeatedly through completed tasks, not courtesy agreement.
- The initial continuation signal is five claimed/corrected portfolios, three organisers completing a second real update, at least two authorised attribution/distribution tests and at least one concrete willingness-to-pay signal; interpret the numbers against the reachable completed-conversation cohort.
- If organisers regard their booking page as sufficient, do not correct visible errors, do not return, or will not authorise any low-effort test, park the organiser-control product rather than building a portal.
- Any organiser build is limited to the smallest repeated workflow and named destinations demonstrated in the manual test.

## Phase 5B — Run the founder-event paid-entry experiment

Goal: answer whether RENM can create attributable completed paid race entries.

Design may begin once Phase 2 establishes trustworthy measurement. Public launch should use the Phase 3 CTA/destination rules and the applicable Phase 4 gate; it does not depend on completing organiser interviews.

Principles:

- Mike/RENM is clearly disclosed as the organiser where legally and operationally accurate.
- The occurrence passes the same public data, trust, discovery and organic-ranking rules as every other organiser.
- Any paid or house promotion is visibly labelled and measured separately.
- The experiment tests commercial conversion; it must not be presented as independent organiser validation.

Pre-registration design:

- Define event capacity, entry price/net revenue, booking costs, target audience and sale window.
- Establish channel labels and unique attribution for RENM organic occurrence pages, RENM internal discovery, RENM labelled promotion, email/reminders, Google organic, AI referral, social, direct and any paid media.
- Capture completed-entry conversion through the controlled booking confirmation or an agreed server/provider callback; do not infer sales from clicks.
- Define acquisition cost, refund/cancellation treatment and a comparison baseline.
- Decide the smallest meaningful success, continue and stop thresholds before launch.

Core measures:

- Occurrence-page visitors and qualified CTA impressions.
- Entry clicks and booking-start rate.
- Completed paid entries, net revenue and click-to-paid conversion.
- Cost per completed entry and contribution after booking/marketing costs.
- Share of entrants demonstrably incremental to RENM-controlled channels.
- Reminder-to-entry and AI/organic-to-entry conversion where samples permit.
- Correction, support, refund and failed-destination incidents.

Acceptance:

- Completed entries reconcile with booking/payment records without exposing entrant personal data in analytics.
- Channel attribution distinguishes organic, house promotion and external marketing.
- Results are reported even if negative and cannot change the event's public trust treatment.
- The experiment produces a commercial decision: repeat/refine, test partnership attribution, or reject entry-generation as the lead model.

## Phase 7 — Accuracy backfill and relationship graph

Goal: convert recoverable weak inventory into trusted event intelligence.

Priority:

1. High-demand or previously visited unknown-date/destination records.
2. Likely recurring series with current official evidence.
3. Geographic/distance gaps with observed runner demand.
4. Remaining recoverable records.

Work:

- Evidence-backed date and entry-state backfill with confidence and checked time.
- Resolve organiser, series and occurrence relationships with role/evidence/confidence.
- Distinguish organiser, official information, booking, waitlist and evidence URLs.
- Create canonical organiser identity endpoints spanning official domains, club sites, social/Facebook pages, governing profiles, booking-provider profiles and aliases; channel type is not a trust rank.
- Add an endpoint-resolution queue for textual/non-clickable clues such as `Facebook Page - Power of 5K`.
- From a verified endpoint, run bounded portfolio expansion: discover candidate events, series, venues, locations, entry pages and aliases; record the traversal path and keep every proposed relationship untrusted until supported.
- Use directories/aggregators for candidate discovery only, with compliant access methods; do not inherit their claims as authority.
- Route every research output through the Phase 1C validator/global registry; do not create region-local canonical IDs or free-form public states.
- Add coordinate derivation/precision and quarantine default/impossible values.
- Re-run duplicate matching after corrected identity, dates and locations.
- Use conservative automation; ambiguous changes enter review.

Acceptance:

- Zero unknown-date occurrences in discovery by construction.
- Backfilled facts are traceable and not manufactured from recurrence.
- A Facebook-only or club-site-only organiser can reach the same organiser verification state when control/evidence is equivalent, while inaccessible or weak endpoints remain clearly limited.
- No graph traversal can publish an organiser-event relationship without evidence and a passed relationship gate.
- Tight-radius results use sufficient coordinate precision.
- Weekly completeness, destination freshness and audit-error trends are visible.

## Phase 8 — Implement series/occurrence presentation and organiser workflow pilot

Goal: surface the relationship graph cleanly and test only the organiser workflow validated in Phase 5.

Work:

- Pilot 10–20 series covering annual, biennial, multi-distance festival, changing venue and separately bookable cases.
- Put dated venue/entry data on occurrences and stable identity/history on series.
- Prioritise the next occurrence and fold history away on mobile.
- Preserve historic occurrence pages and legacy redirects.
- Build the smallest organiser workflow supported by interviews—possibly claim/correct, portfolio maintenance, analytics or change alerts.

Acceptance:

- One occurrence appears once in discovery/counts.
- Series navigation improves clarity without obscuring next action.
- Organiser pilot participants successfully complete the target workflow.
- Broader rollout depends on measured adoption/accuracy, not feature completion.

## Phase 9 — Strengthen reminders and change alerts

Goal: create a consented return relationship around event state.

This phase expands the bounded Phase 3B reminder lifecycle only if fulfilment, return behaviour and operational safety are demonstrated. It is no longer the first implementation of reminder delivery.

Work:

- Double opt-in/confirmed-consent state and enumeration-safe abuse limits.
- Expiring single-purpose tokens, immediate unsubscribe and suppression handling.
- Idempotent delivery/retry; mark sent only after provider success.
- Entry-opening, date/venue-change, cancellation and scheduled-event reminders.
- Approved retention and updated privacy copy.
- Measure confirmed subscription, delivery, downstream entry and unsubscribe/complaint rates separately.

Acceptance:

- Consent and delivery are auditable.
- Failure cannot be recorded as success.
- Reminder types and downstream outcomes are independently measurable.
- Retention/minimisation jobs are verified.

## Phase 10 — Build sync observability and machine-readable distribution

Goal: make one-person operations safe and test RENM as a data plane with real consumers.

Work:

- Extend the Phase 1B ingestion foundation with cross-source operational dashboards, long-term completeness deltas, anomaly alerts and sampled changes.
- Extend approval queues for unexpected source shifts or large demotions.
- Long-term parser/source health, last-good-run and change-state monitoring.
- Regression fixtures from sanitised edge cases and automated pre-production checks.
- Validate SportsEvent/Organization structured data, stable canonicals and safe public projections.
- Define a versioned feed/API contract with freshness, semantics and usage terms.
- Run a narrow publisher/application/AI-data consumer pilot before broad API investment.
- Establish a repeatable prompt panel for citation/mention share across RENM and competitors; keep AI-referred conversions distinct from citations.

Acceptance:

- Mike can determine quickly what changed, what became public and what needs review.
- Abnormal ingestion cannot silently reshape discovery.
- Critical access, eligibility, destination, reminder and ingestion rules have automated coverage.
- At least one external data consumer validates a concrete job and contract, or the API product is paused.

## Phase 11 — Commercial experiments and measured growth

Goal: choose monetisation and growth from evidence.

Possible experiments:

- Referral/completed-entry attribution with one external organiser or booking provider, informed by the founder-event result.
- Clearly labelled organiser promotion with organic ranking held constant.
- Paid organiser workflow/analytics pilot while accuracy/corrections remain free.
- Licensed feed/API pilot.
- Runner premium alert/planning test if retention behaviour supports it.
- Trust-qualified distance, location, year and thematic discovery/SEO expansion.

Acceptance:

- Revenue, contribution, incrementality and trust impact are measured for each experiment.
- No experiment changes verification gates or hides unpaid valid inventory.
- Search-to-occurrence, resolved-intent and completed-entry outcomes improve without higher correction/duplicate rates.

## Next operation after this reset

Complete PX0 before another code run:

1. refresh and commit the governed documentation;
2. install the generated Lovable Project Knowledge and synchronise the governed documents;
3. re-verify the application repository head, origin/main, Lovable publication state and production analytics baseline;
4. inspect current schema/source behaviour against the series/edition/race/result/source contract; and
5. return a bounded PX1 rectification package and partnership one-pager for approval.

Do not ask Lovable to redesign the product or mutate the database from the whole strategy document. Each approved build package must be smaller, testable and rollbackable.

## Out of scope until validated

- Broad redesign of every legacy page before a bounded Explorer vertical slice is validated.
- Broad new SEO-page generation.
- RENM becoming a general booking platform for other organisers.
- Public ingestion provenance.
- Automated deletion of old records.
- Full organiser portal.
- Aggressive automatic merging/date inference.
- Broad production API without a consumer pilot.
- Paid ranking disguised as relevance.

## Approval choices

Mike can approve:

- completion of PX0 documentation sync and read-only application/data preflight;
- preparation of the England Athletics and general data-partner one-pagers without sending them;
- one bounded PX1 rectification package at a time;
- a later feature-flagged PX2 Explorer slice after the safe query/data evidence is reviewed; and
- separately authorised partner outreach, external integrations, production mutations and deployments.
