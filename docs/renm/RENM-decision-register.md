# RENM — Context Reset Decision Register

Status: proposed. “Approve” entries become the durable contract; “Query” entries require Mike's decision or a measured implementation spike.

## Retain as doctrine

| ID | Decision | Reason |
|---|---|---|
| R01 | Trustworthiness and completeness are the strategic goal. | Consistent across the Bibles and current direction. |
| R02 | The RENM platform is a discovery/intelligence/routing layer, not a general booking platform or replacement for organisers; separately disclosed RENM-owned events do not change that platform boundary. | Keeps product and liability boundaries clear while permitting the founder experiment. |
| R03 | Never invent facts; unknown beats false precision. | Core trust rule. |
| R04 | Preserve event history; use reversible states under uncertainty. | Supports fragmented and biennial events. |
| R05 | Provenance is private; public destinations are intentionally selected. | Maintains operational evidence without exposing seed sources. |
| R06 | The organiser is the preferred identity authority; the primary CTA follows the verified runner action and may use an organiser-designated booking platform. | Separates authority from entry destination. |
| R07 | Entry click is the primary conversion. | Aligns runner value and organiser value. |
| R08 | Search result pages remain noindex; SEO surfaces require evidence and inventory. | Protects search quality. |
| R09 | Mobile-first presentation. | Supported by current traffic and product use. |
| R10 | Reminders are a meaningful retention channel. | Directly confirmed; requires stronger consent/delivery implementation. |
| R11 | RENM's demonstrated present value is event-intent resolution and entry routing; internal site search remains an unproven growth hypothesis. | Supported by July 2026 Plausible behaviour. |
| R12 | Entry state and visibility gate are separate. | A trusted race may not yet be open; an open-looking URL may still be weak evidence. |
| R13 | LLMs are distribution/data consumers, not the product's primary customer. | Keeps the public service runner-first. |
| R14 | Accuracy, inclusion and basic corrections are never pay-to-play. | Required for trust and organiser fairness. |
| R15 | Sponsored promotion is labelled and cannot change trust gates or organic relevance. | Allows monetisation without corrupting the dataset. |
| R16 | RENM's own events may be the first paid funnel experiment, with disclosure, common public rules and separate experiment attribution. | Provides end-to-end commercial evidence without pretending to be an independent organiser result. |
| R17 | A source sync is an evidence observation, not a destructive mirror. | Preserve fragmented/biennial history while making current source presence, absence and change auditable. |
| R18 | Officiality is relationship- and control-based, not domain-type-based. | A club website or organiser-controlled social page may be authoritative even without booking; the runner CTA remains a separate decision. |
| R19 | Verified organiser endpoints are graph-expansion seeds, not automatic facts. | They can reveal portfolios, venues and destinations while candidate gates prevent false stitching. |
| R20 | Regional/agent research is a candidate-evidence source, never a publishing feed. | Both July pilots produced valuable discoveries plus structural errors that require deterministic validation. |
| R21 | Canonical IDs and controlled vocabularies are global across every region and source. | Region-local IDs and free-form states make otherwise sound research impossible to merge safely. |
| R22 | One graph edge may have many evidence observations. | Prevents evidence volume from inflating relationship and portfolio counts. |

## Supersede or clarify

| ID | Previous/implicit position | Proposed replacement |
|---|---|---|
| S01 | `ACTIVE` can mean publicly live. | Separate lifecycle, date, canonical, verification and visibility gate. |
| S02 | Homepage ACTIVE count is “UK races live right now.” | Count only canonical, confirmed-future G3/G4 occurrences and label precisely. |
| S03 | Undated ACTIVE rows can enter discovery as current candidates. | Undated rows are excluded and enter an evidence-backed backfill queue. |
| S04 | Raw record volume demonstrates completeness/moat. | Qualified coverage, accuracy, provenance and resolution speed demonstrate moat. |
| S05 | Historic Bibles can act as current master instructions. | Preserve them as decision history; Project Knowledge + contracts become current authority. |
| S06 | Current security can be described as clean. | Security is not clean until anonymous base-table exposure and regression tests are resolved. |
| S07 | Reminder creation equals a valid subscription. | Confirmed consent and explicit delivery state are required. |
| S08 | One flat event entity can represent series and editions. | Stable series parent plus dated occurrences and private evidence. |
| S09 | A vanished event/link suggests deletion. | Demote/recheck; terminal treatment requires affirmative evidence or retention decision. |
| S10 | City distance chips are an unfinished defect. | They were intentionally deferred; reintroduce only when inventory/UX rules are approved. |
| S11 | Sync is either automated or manual. | Scheduled ingestion is automated; Mike manually supervises and may trigger additional runs. |
| S12 | The organiser website should automatically receive the primary CTA. | Identity authority, official information and entry action are typed separately; the verified next action wins. |
| S13 | Entry Click alone is the north star. | Successfully resolved runner intent is the outcome; qualified Entry Click and completed entry are components. |
| S14 | A generic race directory is the core product. | The core is trusted race identity, state and next-action resolution distributed through event pages, discovery, search, AI and partners. |
| S15 | `updated_existing` means the stored record materially changed. | Separate processed existing, unchanged and materially changed; retain field-level/run-linked evidence. |
| S16 | A successful sync proves all retained `ACTIVE` source records remain present. | Persist the observed source manifest; missing identities enter a reversible source-missing/recheck state and cannot remain silently current forever. |
| S17 | Facebook-only or club-site-only presence is intrinsically second-class. | Evaluate control, official designation, currency and accessibility; keep identity authority separate from entry capability. |
| S18 | A discovered organiser URL can automatically populate its apparent portfolio. | Traverse it into candidate relationships with evidence/confidence, then verify before canonical/public use. |
| S19 | Repeated supporting claims are repeated organiser-event relationships. | Store one unique typed edge and attach multiple evidence observations. |
| S20 | A registration-looking URL proves entries are open. | Entry state requires an observed state, checked time and appropriate destination. |
| S21 | Regional research can generate its own canonical IDs and state labels. | Resolve through a global registry and approved enums before canonicalisation. |
| S22 | Network size/evidence volume should drive verification rank. | Rank unique in-scope occurrences by runner value, trust gap and review cost; segment parkrun-like networks. |

## Immediate red decisions recommended for approval

| ID | Recommendation | Production action only after approval |
|---|---|---|
| A01 | Quarantine `Test` and `TEST3`. | Remove from all public surfaces without deleting evidence. |
| A02 | Close anonymous access to the base `events` table. | Route public reads through safe projection/server APIs; test before deployment. |
| A03 | Replace public count semantics. | Deploy corrected eligibility query and honest wording together. |
| A04 | Exclude unknown dates from discovery. | Change shared eligibility layer, then audit every route and sitemap. |
| A05 | Prevent public duplicate occurrences. | Repair known escapes, redirects and canonical mapping; then strengthen ingestion gates. |
| A06 | Correct reminder consent and failed-send state. | Double opt-in, rate limit, idempotent retries, sent only after success. |
| A07 | Add source-observation and logical-run instrumentation before relying on rebuilt governing-body cron jobs. | Record first/last seen, material changes, source-missing candidates, chunk reconciliation and gate impact; do not auto-delete. |
| A08 | Install a deterministic research-intake validator before importing regional research or commissioning more regions. | Enforce global identity, enums, evidence references, unique edges, entity classes and correction reports. |

## Resolved current questions

| ID | Decision |
|---|---|
| D01 | G3 requires verified official information and honest entry state, not necessarily open entries. |
| D02 | Organiser-designated booking platforms qualify as official entry destinations. |
| D03 | RENM-owned events may test paid-entry conversion but receive no hidden organic or trust advantage. |
| D04 | Structured data/API work follows runner-facing accuracy and a buyer/partner hypothesis; it is not an SEO-content shortcut. |

## Queries needing resolution

| ID | Query | Recommendation/default |
|---|---|---|
| Q02 | Does the live count include parkruns, junior parkruns, virtual races or only entry-based races? | Define separate named counts; do not mix materially different inventory behind “races.” |
| Q03 | How should cancelled future events appear? | Accessible/noindex with clear cancellation when useful; excluded from discovery and counts. |
| Q04 | Should estimated dates ever appear publicly? | No in the first trust model. Revisit only with explicit labelling and evidence standards. |
| Q05 | Minimum coordinate precision for postcode-radius results? | Postcode centroid or better, labelled/ranked by precision; town centroid excluded from tight radii. |
| Q06 | What establishes an organiser as verified? | Official-domain evidence or repeated consistent official relationships, with manual override and audit. |
| Q07 | When is a series page indexable? | At least two supported editions plus meaningful stable content and a current/useful occurrence. |
| Q08 | Should G2 pages be reachable from ordinary discovery or only direct/expanded results? | Show after G3/G4 with a clear limited-data treatment; never in close-radius results if location is imprecise. |
| Q09 | Retention period for dormant public pages. | Review at 24 months; consider public retirement after four years while keeping internal history. |
| Q10 | Should Mike remain on a shared-password admin or move to identity-based login? | Move to single-user identity/passkey or magic-link auth after urgent public-data fixes. |
| Q11 | Should historic source labels ever be publicly credited? | No by default. Publicly show organiser/official destination, not ingestion provenance. |
| Q12 | Can aggregate anonymised search data be kept longer than 12 months? | Yes only after irreversible aggregation and a documented purpose. |
| Q13 | How fresh must entry-state verification be by provider/event type? | Begin with risk-based rechecks and measure state-change frequency before fixing one SLA. |
| Q14 | Which booking providers/organisers will support referral or completed-entry attribution? | Test the RENM-owned funnel first, then approach providers with evidence. |
| Q15 | Which organiser problem is strongest: portfolio accuracy, correction workflow, demand analytics, promotion or syndication? | Resolve through 15–20 structured organiser interviews before a portal build. |
| Q16 | What would a publisher, application or AI provider license? | Conduct buyer interviews/API pilot before productionising a broad public data product. |
| Q17 | How should RENM-owned races be disclosed publicly? | Use clear organiser identity and normal sponsored labels if paid promotion is used; no special trust badge. |

## July 2026 validation evidence

Plausible's 28-day dashboard observed approximately 1.7k visitors, 1.8k visits, 2.6k pageviews, 700 unique `Entry Click` converters and roughly 1,000 Entry Click events, giving a nominal 40.4% conversion rate. Google supplied about 1.4k visitors and 617 Entry Click converters. The custom event included event, domain and link-type properties and routed runners across organiser sites, governing-body systems and booking platforms.

Internal product discovery was much smaller: 12 unique Search Performed users, seven Search Result Click users, 21 filter users and 35 homepage visitors in the same view. ChatGPT supplied 19 measured visitors with 43 pageviews, 21% bounce, 2m43s average duration and seven Entry Click converters; Perplexity supplied two visitors and one Entry Click converter. Samples are small and citation-without-click is not measured.

Interpretation: RENM has evidence of useful event-page-to-destination resolution, not yet evidence of destination-site or organiser-product fit. Entry Click instrumentation must be audited before these figures become contractual baselines.

Scottish Athletics sync validation on 24 July 2026: 152 fetched, 105 eligible, 12 duplicate skips, 93 existing upserts, zero inserts and a successful 6.558-second run. The source table remained at 145 rows. A full before/after comparison found one material change (coordinates for The Great Carradale Canter) and 92 identical upserts. The eligible count was five below the preceding run, but no retained row was marked absent or queued for review. This is evidence for R17, S15, S16 and A07.

England Athletics sync validation on 24 July 2026: four successful chunks produced 638 fetched/eligible, 198 duplicate skips, 439 writes, 18 inserts and 421 existing upserts. The EA table rose from 1,473 to 1,491 with no deletion. Full comparison found one material existing change (Woodstock 12 & 4 moved from 29 November to 8 November) and 420 identical rewrites. The prior feed count was 641, but chunk logs retained no membership manifest. All inserts became `ACTIVE` immediately and lacked organiser identity; two entry destinations were malformed/non-URLs and two were generic provider homepages. This additionally establishes that A07 must include an intake/publication quality gate, not logging alone.

## Known facts to verify during implementation

- Re-run all audit counts immediately before migration; July figures are a snapshot.
- Confirm every frontend/server/database route that reads `events` directly before revoking grants.
- Confirm whether the two test rows support any required ingestion test fixture outside production.
- Inspect all duplicate public URL traffic/backlinks before selecting redirect versus noindex.
- Inventory every place `status = ACTIVE`, `sort_date IS NULL`, public count or sitemap eligibility is encoded.
- Verify current reminder provider behaviour, bounce handling and unsubscribe flow.
- Confirm existing privacy notice against actual telemetry and proposed retention.
- Audit the custom Entry Click trigger and confirm its distinction from Plausible automatic outbound tracking.
- Verify the exact steps and event definitions behind the Search Performed and Organiser Acquisition funnels.
- Define the RENM-owned event experiment before promotion or entries launch, including baseline, channel labels, costs, completed-entry attribution and disclosure.

## Context authority order

When sources conflict, use:

1. Approved Project Knowledge and explicit current contracts.
2. Approved decision register/build brief.
3. Current production schema/code and measured behaviour (descriptive truth, not automatically intended truth).
4. Strategy Bible for historic rationale.
5. Project Bible and sprint logs for implementation history.
6. Chat history as supporting evidence only.

Conflicts are raised explicitly. No AI system silently merges contradictory instructions.

## Decisions recorded at context reset — 25 July 2026

| ID | Decision | Consequence |
|---|---|---|
| D18 | Structural research-package PASS is not a RENM production promotion decision. | Accepted packages may enter staging/reconciliation only; G2/G3/G4 requires live-record evaluation. |
| D19 | Agent self-validation is not sufficient for high-impact data packages. | Independently validate foreign keys, mapping targets, stable IDs, source coverage, vocabularies and immutable hashes. |
| D20 | Stable identifiers survive evidence enrichment and review. | Unchanged logical relationship keys retain their accepted edge IDs; only genuinely changed/new edges receive different IDs. |
| D21 | Mapping tables are part of referential integrity. | Each composite mapping key is unique and each non-empty target must resolve to the final entity/edge it claims. |
| D22 | `entry` is the canonical stored destination role; availability belongs to `entry_state`. | Do not create parallel roles such as `live entry/booking`; retain accessibility and verification separately. |
| D23 | Resolved decisions may retain residual uncertainty without becoming unresolved again. | Store `collision_residual_uncertainty` separately from unresolved collision decisions and schedule follow-up where useful. |
| D24 | The final Kent package is accepted as a candidate-stage evidence source. | Use `kent-medway-candidate-evidence-reviewed-normalised-final` for future reconciliation; preserve all earlier derivatives as audit history. |
| D25 | South London is structurally accepted but not equivalently entry-verified. | Preserve its corrected package as a candidate source and expose the remaining verification gap in planning. |
| D26 | Regional pilot data is not piped directly into Lovable. | Build a controlled staging/reconciliation workflow first and record proposed live/public effects. |
| D27 | Strategy synthesis precedes the next Lovable instruction. | Review runner-problem/Reddit research, competition, moat and monetisation; then amend/approve the build sequence before Phase 0. |

## Decisions recorded after organiser-contact discovery — 29 July 2026

| ID | Decision | Consequence |
|---|---|---|
| D28 | RENM will compete initially on trusted occurrence resolution and correct next action, not generic directory breadth. | Repair and measure decision quality before expanding inventory or SEO surfaces. |
| D29 | Authority is field- and role-specific. | Record who controls each material fact; do not treat any organiser, platform or reconciler as universally authoritative. |
| D30 | Organiser, owner, host club, race director, registration provider, timer and results operator are separate roles. | Contact discovery, public presentation and attribution must not collapse them into `organiser`. |
| D31 | Publicly contactable does not mean commercially prospectable. | Respect channel purpose, explicit no-sales instructions and privacy/direct-marketing requirements; keep prospectability private. |
| D32 | Universal `update once, publish everywhere` is not an approved product commitment. | Each external destination requires an authorised, supported delivery route and independently confirmed state. |
| D33 | The organiser-control hypothesis begins as a manual service test. | Do not build a portal or integration estate before organisers correct, return, authorise and show behavioural demand. |
| D34 | The bounded organiser hypothesis is a canonical portfolio and change-distribution layer, not booking, timing or results software. | Link to operational platforms and preserve their distinct authority. |
| D35 | Outbound traffic is not organiser value until measurement is audited and outcomes are tested. | Present clicks conservatively and seek aggregate completed-entry reconciliation or an authorised attribution test. |
| D36 | Organiser dossiers and outreach eligibility are private research. | Do not place contacts, restriction notes, prospect lists or raw dossiers in public projections or Lovable context. |
| D37 | Data structure, local completeness, reminders, APIs and difficult reconciliation are not presumed moats. | Describe defensibility only after demonstrated compounding participation, proprietary outcomes, switching costs or network effects. |
| D38 | The founder event validates RENM-controlled entry generation only. | It does not by itself validate independent-organiser demand, syndication or organiser software. |
| D39 | Apparent reminder/subscriber records that are absent from admin are a critical reconciliation incident, not evidence of valid consent or successful delivery. | Preserve provider/database/log evidence; do not manually recreate, contact or delete addresses until identity, consent, confirmation and delivery states are reconciled. |
| D40 | The 29 July admin view confirms 23 stored reminder rows across 17 events, including one controlled Mike row; all displayed reminder-sent states are blank. | Treat 22 apparent external records across 16 events as strong preliminary retention evidence, but not as confirmed consent, delivery or conversion. Audit before messaging. |
| D41 | The quick subscriber admin interface is a production mutation made before the context-reset Phase 0 boundary. | Preserve it for evidence, identify its commit/query/access controls and review privacy/security; do not assume its current implementation is approved permanent admin design. |
| D42 | Immediate acknowledgement, consent confirmation, scheduled reminder and unsubscribe/suppression are separate lifecycle events. | Do not collapse them into one `Reminder sent` boolean or describe acknowledgement as double-opt-in confirmation. |
| D43 | A closing reminder requires an evidenced entry-closing trigger or an explicitly different event-date reminder contract. | Do not promise `before entries close` from the event date alone; reject or honestly handle subscriptions after the valid scheduling point. |
| D44 | No scheduled reminder sender currently exists; reminder fulfilment was deliberately parked pending demand. | Treat blank reminder-sent states as expected current behaviour, not evidence of scheduler failure. Audit acknowledgements and stored consent, then design fulfilment separately. |
| D45 | The stored external reminder requests validate demand for a bounded fulfilment pilot. | Move the minimum safe reminder lifecycle earlier in the build sequence, but do not build broad alerts or send historic/backfilled messages without record-level eligibility review. |
| D46 | Mike will temporarily leave the live reminder form unchanged and monitor new requests for manual fulfilment. | No automated sender or form change is authorised. Each manual action must be based on verified current event/entry facts, honour the stated purpose, provide an unsubscribe route and be logged without exposing addresses in strategy records. |
| D47 | The 30 July code audit found a reminder sender endpoint and a migration scheduling it daily, contradicting D44 and Mike's operational understanding. | Treat D44 as factually superseded. Do not manually fulfil, activate, disable or modify anything until production cron, vault, HTTP, queue and send-log state establish whether automation is active and which records are due or attempted. |
| D48 | With Mike's approval, production cron job 6 `send-race-reminders-daily` was paused on 30 July using `cron.alter_job(..., active := false)` after live evidence showed active scheduling but `401` endpoint responses. | Keep the definition inactive. Do not reactivate or repair its authentication until the reminder contract and affected-record handling are explicitly approved. Other cron jobs were verified unchanged by the containment operation. |
| D49 | Reminder sending must remain fail-closed at both scheduler and HTTP boundaries. | Job 6 remains inactive and the sender endpoint returns `503` unless `REMINDER_SENDING_ENABLED` is exactly `true`. Do not enable the flag or repair scheduler authentication without a separately approved reminder lifecycle. |
| D50 | The 24 stored reminder requests are retained as behavioural demand evidence, not proof of fulfilled reminders or completed entries. | Keep addresses private; report aggregates only. Mike will monitor new requests and any manual treatment must follow D46 until a safe lifecycle is approved. |
| D51 | Admin absence and empty data are distinct states. | Subscriber administration must show an explicit expired/unauthenticated state rather than presenting authentication failure as an empty list. |
| D52 | Admin navigation will expose aggregate unseen-work indicators without emailing Mike. | New subscriber, race-submission and club-submission activity may create a red badge; viewing the relevant authenticated data marks it seen. Legacy subscriber rows were backfilled as seen. |
| D53 | The maintenance containment release is the new operational baseline. | Production commit `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4` has clean typecheck, 31 passing tests and a successful build. Resume trust work from this point; do not reopen contained reminder sending as incidental maintenance. |

## Decisions recorded at the interactive product reset — 7 August 2026

| ID | Decision | Consequence |
|---|---|---|
| D54 | Pause L3B-5B and test RENM as an interactive race decision product before continuing the previous technical sequence. | Design and validate a Race Explorer MVP using existing safe data; make no application, schema or production-data change until the product design and feasibility evidence receive separate approval. |
| D55 | Retain indexable landing and event pages as acquisition routes into the interactive product. | Do not replace or expand the SEO inventory during the design package; pre-filter the eventual Explorer from existing routes. |
| D56 | Treat post-event results resolution as a first-class runner journey, beginning with authoritative result state and destination rather than copying all athlete rows. | Define a bounded rights-aware results-link pilot; runner-level ingestion requires a separate privacy, licensing, identity and quality decision. |
| D57 | Run the reset as a 120–150 day evidence experiment rather than an indefinite build. | Fix the baseline during PX1 and make a continue, narrow or stop-major-investment decision at PX5; shipped features and time spent are not success measures. |
| D58 | Contract the lead product to trusted UK race intelligence. | Prioritise canonical series, editions, races, courses, destinations, source freshness and results resolution over generic community, training or broad-directory expansion. |
| D59 | Use governing/licensing bodies, registration providers, timing/results providers and organisers as the preferred direct-data backbone. | Begin with small read-only pilots and written field, identity, update, storage, display, attribution, correction, privacy and termination boundaries. |
| D60 | Treat Strava and Garmin as optional runner-authorised enrichment channels, not the canonical race catalogue. | Consider Strava for consenting-runner activity and distribution; consider Garmin course delivery after official route provenance exists. Do not depend on either for unauthorised public inventory or named results. |
| D61 | Every material public field must have source identity, freshness, confidence, rights and reversible conflict/change treatment. | Repair synchronisation and canonical matching before scaling feeds; unchanged upserts, material changes, source absence and authoritative conflicts remain distinct states. |
| D62 | Adopt OpenRouter's explorable-catalogue composition principle without copying its visual identity or business model. | Build a persistent mobile-first Explorer, comparable records and detailed event intelligence while keeping existing indexable routes as acquisition entrances. |
| D63 | Run a measured data-led social and video distribution programme. | Derive useful race radar, comparison, course and results content from RENM data; deep-link and attribute each campaign; do not treat reach or generic AI output as product evidence. |
| D64 | Begin results expansion with authoritative links, publication state, coverage and permitted aggregates. | Named runner-result ingestion requires a separate source agreement, lawful basis, transparency, correction, retention and identity-matching approval. |
| D65 | Preserve option value if the evidence gate fails. | Stop major investment when combined signals remain weak; maintaining a low-cost pet project, packaging, licensing, sale or open-source release are separate later decisions, not automatic outcomes. |
| D66 | Treat Lovable as RENM's validation/incubation platform, not an assumed permanent infrastructure commitment. | Remain on Lovable through the evidence window while keeping GitHub, migrations, data exports, integration boundaries, core rules, analytics definitions and configuration reproducible and portable. Do not migrate pre-emptively. |
| D67 | Trigger platform graduation from demonstrated operational need rather than preference. | At PX5 or later, assess sustained traffic, feeds/background jobs, SSR/SEO/performance, CI/CD, observability, security, cost and deployment constraints. Graduate only the constrained layers; frontend/hosting may move while Supabase/Postgres remains. |
| D68 | Finish and verify bounded existing-schema rectification, then run two product tests before broader infrastructure or schema work. | Test the Explorer on the existing backend first, then one authorised course-rich event page using toGeoJSON, Turf, Leaflet and Recharts. Introduce PostGIS, `pg_trgm` or broader series/edition/race/result/source schema only when measured prototype evidence demonstrates a named need. |

## Decisions recorded after the outbound-wayfinding dry run — 14 August 2026

| ID | Decision | Consequence |
|---|---|---|
| D69 | A RENM occurrence may have several legitimate role-specific next destinations rather than one universal official URL. | Present and track entry, organiser details, licensing, course and results destinations separately when evidenced; label the expected destination before the click and deduplicate identical URLs. |
| D70 | Approve a bounded outbound-wayfinding/source-graph pilot using the Saturn/TRA/Eventrac and FNUL/OpenTrack journeys. | Correct only the reviewed rows through reversible audited writes, use existing fields first and test one server-rendered destination panel without bulk enrichment, outreach, filters or a national organiser graph. |
| D71 | Organiser classification, licensing body/status and registration provider are separate dimensions. | Do not infer one from another. Consider a destination relation, organiser model or public filters only after a varied 6–10 event sample demonstrates stable roles and useful runner behaviour. |

## Decisions recorded after showcase review — 15 August 2026

| ID | Decision | Consequence |
|---|---|---|
| D72 | Demonstrate outbound-wayfinding breadth with four reviewed occurrences, but do not mutate production data merely for the England Athletics partnership call. | Use exact-row, fail-closed code manifests for FNUL, Rubber Ducky, Sedgefield and Hertfordshire; retain the original Saturn pilot and require a later decision before durable schema/data modelling. |
| D73 | Use one dominant primary destination and a compact responsive secondary grid; treat post-race results as a lifecycle state rather than leaving a stale entry action. | Before the race, entry is primary. After the date, suppress entry and show a non-clickable completed/results-coming-soon state unless an exact reviewed occurrence-results URL exists; keep valid secondary information links. |
| D74 | Public governance claims must follow the reviewed destination evidence, while private acquisition provenance remains private. | Label an England Athletics search destination as a listing rather than licence/approval; assert TRA approval only where the permit states it; keep commercial organiser, registration provider, governing/licensing body and status separate; never expose runABC or other private acquisition provenance. |
| D75 | Outbound signposts must name the runner action and external destination without duplicating URLs or exporting a journey RENM already serves better on-page. | Order entry, organiser site, distinct registration occurrence, governing association, licence/permit and additional official information; expose providers in concise labels where useful. Remove Hertfordshire's Strava route exits because RENM already embeds the reviewed routes, while retaining course links that add a useful distinct destination on other events. |
| D76 | Treat event-page information depth as a separate quality-of-life rectification layer: correct unsupported semantics first, then canonical data/linkage, then useful fact projection, with prose last. | Run bounded QL1–QL5 packages from the 15 August gap map. Keep governance, licence state/record, organiser and registration provider separate; do not auto-publish raw location/provenance or add venue/destination schema before a varied sample demonstrates the residual need. |

## Decision recorded after QL1 production acceptance — 15 August 2026

| ID | Decision | Consequence |
|---|---|---|
| D77 | Accept the bounded QL1 production result after transition-safe redeployment, audited Sedgefield correction and cross-pilot live verification. | Render a permitted claim only from canonical `licensed='true'`; keep governance/body, licence state, organiser and registration provider separate. Retain the full forward/rollback/recovery audit chain, leave `organiser_club_id` unset, and remove the temporary Sedgefield identity alternative only through a later separately verified cleanup. |
| D78 | Close the outbound-wayfinding pilot and remain on the approved information-depth sequence. | No further pilot acceptance work blocks data rectification. Begin QL2 with read-only evidence and exact existing-schema previews; require separate approval before production writes. Keep QL3 entity coverage, QL5 schema decisions and transition-guard cleanup separately gated. |
