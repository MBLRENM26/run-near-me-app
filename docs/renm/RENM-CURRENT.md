# RENM — Current Operating Kernel

Status: canonical short-form context for Mike, Codex and Lovable. Linked contracts retain authority; Lovable context is generated from this file.

Last reviewed: 18 September 2026

Note: sections dated before 18 September 2026 are retained as historical checkpoints. The `Operating checkpoint — 18 September 2026` section at the end of this file carries the current state, planned workstreams and active order, and supersedes the earlier `Active order` where they differ.

## Authority order

When instructions conflict, use:

1. Mike's latest explicit instruction.
2. This current operating kernel for immediate state and boundaries.
3. [Project Knowledge](RENM-project-knowledge.md).
4. [Data and Lifecycle Contract](RENM-data-lifecycle-contract.md).
5. [Decision Register](RENM-decision-register.md), interpreted through the generated decision ledger.
6. [Phased Build Brief](RENM-phased-build-brief.md).
7. Dated audits and findings in `docs/current/`.
8. Historic Bibles, archived prompts and earlier chat as supporting history only.

Raise conflicts; never combine superseded facts with current decisions.

## Verified operating baseline

- Verified merged/published app head: `a1838de3f8e8dc31223eff4dc8afcb83cd6bd720`; local and origin `main` match.
- Containment baseline: `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`; later acceptance is recorded below.
- PX2B pre-merge checks passed: TypeScript, 88 tests, scoped lint and production build.
- Reminder job 6 is inactive; HTTP fulfilment fails closed with `503` unless `REMINDER_SENDING_ENABLED=true`. No scheduled reminder was sent; first requests do receive an automatic transactional confirmation.
- Mike reported another subscriber on 12 August; no private-table audit was run. This is demand evidence, not fulfilment or value.
- Confirmation-copy hotfix `92123320...` is live (38 tests/build passed). The form remains under approved record-level manual monitoring.

## Operating thesis and evidence window

Demonstrated journey: `Google/AI → RENM occurrence page → correct official/entry destination`. Occurrence traffic and outbound hand-offs are observed; clicks are not registrations, revenue or organiser value.

RENM will run a 120–150 day trusted UK race-intelligence experiment. Rectify the existing catalogue first; then test an OpenRouter-style Explorer on the existing backend and one authorised course-rich event page. Broader canonical modelling follows only where those tests demonstrate need. Add authorised feeds and data-led distribution in separate packages; then continue, narrow or stop major investment from fixed signals.

Preferred data order: governing/licensing bodies, registration providers, timing/results providers and organisers. Strava/Garmin are optional runner-authorised enrichment, not the canonical catalogue; named results remain separately rights/privacy-gated. See [product reset](RENM-interactive-race-explorer-product-reset-2026-08-07.md).

Lovable is the validation platform; GitHub is source of truth and the build remains portable. Migrate layers only when measured product, traffic, feed, performance, delivery, security or cost constraints justify it.

## Active non-negotiable boundaries

- Do not activate or test automated reminders against real subscribers.
- Do not message historic subscribers or perform bulk/backfilled reminder messaging.
- Keep Kent, South London and other regional research out of production pending staging/reconciliation.
- Do not build an organiser portal or universal `update once, publish everywhere` system.
- Do not expand SEO inventory, redesign every legacy page or start a repository-wide refactor before the bounded Explorer is evidenced.
- Do not ingest a partner/platform feed without stable identity, update semantics, permitted use, provenance, corrections and reversible conflict handling.
- No named-result warehouse or repurposed Strava/Garmin activity without separate agreement/privacy approval.
- Do not delete history merely because an occurrence passed or disappeared from a source.
- Do not expose personal contacts, private prospectability, raw provenance or moderation fields publicly or in Lovable context.
- Do not claim that clicks equal entries, registrations, revenue or organiser value.
- Each implementation package needs separate approval, rollback, tests and production acceptance.

## Current work state

- K1 knowledge control is complete; this kernel, manifest and ledger govern the canon and are mirrored to Lovable.
- L1/L2 audits remain the correction baseline: public/base access is wider than intended, surface/date eligibility disagrees and the 5,368 headline is not a discovery count.
- L3A/L3A-R safe public projection and invoker remediation are live. L3B region, homepage, county, city and distance-stabilisation packages are complete with their dated acceptance records; L3B-5B is paused.
- PX0 operating reset is active. Strategy and documentation are approved; app, schema, production-data, integration and deployment mutations remain separately gated.
- PX2A Explorer is live as an unlinked, `noindex` preview at `/explore`; desktop/mobile, postcode/radius, inspection, comparison and console acceptance passed on 12 August.
- PX2B source enrichment is accepted: EA/SA syncs, taxonomy/tags, Scottish geocoding, Kilmarnock correction and reversible hiding of two TRA test rows passed. Residuals are bounded legacy/source-data work. See [PX2B](RENM-PX2B-source-enrichment-package-2026-08-12.md).
- PX2C's candidate is `North Downs Run 2026`. Its organiser publishes Plotaroute route `2277816`; attributed embed use is cleared, but custom GPX reuse requires permission and 2025-to-2026 edition confirmation. No asset or schema change is approved. See [PX2C](RENM-PX2C-course-rich-event-page-package-2026-08-12.md).
- At `9558063`, event-detail analytics changed from `Entry Click` to `Outbound Click` with conservative analytics-only `destination_role`. Historical data stays separate; a click is only a hand-off. This is not public/data-layer L6 and changes no CTA, trust or discovery rule.
- No L3C base-grant hardening or L4 eligibility implementation has been approved. Prior trust packages resume only for a named PX dependency.

## Active order

1. PX0 reset/preflight: install canon; re-verify app head, production, analytics and worktree; inventory source/data defects; prepare the England Athletics and partner brief.
2. PX1 bounded rectification: inventory and correct identity/source defects with the existing schema through reversible, separately approved packages.
3. PX2 bounded tests: keep the accepted Explorer on the existing backend; test the attributed North Downs Run course embed, then use toGeoJSON, Turf, Leaflet and Recharts only after custom route-file permission and edition confirmation; retain SEO entrances.
4. PX3 evidence-led expansion: add PostGIS, `pg_trgm`, broader schema or integrations only for a need demonstrated by the prototypes or source pilots.
5. PX4 tracked data-led search/social/video distribution and return behaviour.
6. PX5 day-120–150 evidence gate: continue, narrow or stop major investment; if continuing, assess platform fit without assuming a full-stack migration.

Kent/South London remain offline.

## Evidence discipline

Label material statements as:

- **Sourced fact:** supported by a named reproducible source.
- **Observed evidence:** directly observed in a defined period with method and limitations.
- **Inference or hypothesis:** an interpretation to test, never restated as fact.

Acceptance is not promotion. Stored, live, discoverable, countable, indexable and enterable-now remain distinct.

## High-risk decision pointers

- D28: compete first on trusted occurrence resolution and correct next action.
- D31/D36: public contactability is not commercial prospectability; outreach research is private.
- D33/D35: organiser control begins as a manual service test; outbound traffic is not organiser value.
- D44 is superseded by D47: a sender and scheduled job existed despite earlier understanding.
- D46: manual monitoring only, with verified facts, purpose, unsubscribe and private logging.
- D48/D49: job 6 remains inactive and HTTP sending remains fail-closed.
- D50 recorded 24 requests; Mike reported another subscriber on 12 August without a fresh private-table audit.
- D53: the containment release is the operating baseline.
- D54–D56: pause the old sequence; retain SEO acquisition; start results with authoritative resolution rather than copied runner rows.
- D57–D67: run the time-boxed race-intelligence experiment; prefer authorised direct sources; treat Strava/Garmin as enrichment; require field-level provenance; distribute measurable data-led content; preserve option value if the gate fails; keep the build portable and graduate platforms only from demonstrated need.
- D68: finish existing-schema rectification, then run the Explorer and authorised course-page tests before approving PostGIS, `pg_trgm` or broader schema work.

The ledger indexes lifecycle state; Decision Register text remains canonical.

## Update protocol

After every approved decision or completed package:

1. Update the relevant canonical document once.
2. Update this kernel only if immediate state, boundaries, active package or authority changed.
3. Run `.\scripts\renm-knowledge.cmd --refresh-hashes`.
4. Commit the canonical changes and generated outputs together.
5. Install the generated Lovable Project Knowledge and sync the governed documents into Lovable.
6. Verify hashes, Project Knowledge content, repository commit and production/deployment state separately.

Do not edit `RENM-lovable-project-knowledge.generated.md` or `RENM-decision-ledger.generated.json` by hand.

## Operating checkpoint — 18 September 2026

Documentation-only checkpoint. It records state and plans; it authorises no application, schema, production-data, configuration, scheduled-job, integration, UI or deployment mutation.

### Observed state and limitations

- **Reminder demand (observed evidence, production read, recent 90-day window, 18 September 2026):** 36 stored race-reminder requests from 34 distinct email addresses; only two addresses requested more than one race. The previously agreed prototype trigger of 25 stored requests is met. Repeat behaviour is a secondary observation to test, not an additional veto and not a retrospective gate. These are interest signals only — not paid intent, delivered value, entries or revenue.
- **Live path (observed evidence):** a request stores an event-specific reminder row and queues an immediate confirmation email. An authenticated subscriptions admin page and unseen-work indicators exist. There is no reliable fulfilment loop after confirmation: scheduled reminder job 6 remains inactive and the HTTP sender remains fail-closed unless `REMINDER_SENDING_ENABLED` is exactly `true`.
- **Implementation findings, not repairs:** the sender currently marks `reminder_sent_at` after an attempted send even when enqueueing fails, so a failed reminder can become invisible and unretryable. Confirmation-delivery failure is not surfaced to the public flow. Both are defects scoped into the planned package.
- **Boundary:** no historic or bulk subscriber messaging is approved. Historic records require individual eligibility and purpose review before any fulfilment.
- **Organiser Gap (observed evidence, dated production read):** the Organiser Gap admin page is live and read-only. 1,181 future ACTIVE events; 141 with a usable named organiser (12%); 108 literal `TBC` and 10 literal `Unknown` rows from a single 8 May import; 575 unnamed England Athletics events of which 566 hold `organiser_url` evidence. These counts are volatile observed evidence, not permanent doctrine.
- **Organiser Review Layer (ORL) — corrected baseline, 18 September 2026:** ORL is not an organiser-name approval table. It is the private evidence-resolution and review graph that consolidates the disparate threads validating a race occurrence and its relationships: canonical organisations, aliases/trading/source names, organiser and club sites, organiser-controlled Facebook/social endpoints, governing-body observations, registration/booking platforms (SI Entries, Eventrac, EntryCentral and similar), platform accounts and tenant identifiers, source clues, duplicate-row caveats, and multiple evidence observations supporting one unique typed relationship. Channel and role stay separate: a Facebook endpoint may support identity or official-information authority, and an event-specific registration-platform record may support occurrence identity and the runner's action destination, but neither becomes the organiser because of its host. Full endpoint/path/platform identifier, the claim made, the evidence and corroborating relationships all matter.
- **ORL plumbing to preserve, not rebuild or bypass:** organisations, aliases, `organisation_platform_accounts`, `identity_evidence` with fingerprints, unique typed `organisation_event_links`, link-evidence joins, the append-only reviews/state machine, unresolved seed quarantine, the hash-locked intake queue and validator, and the admin review surfaces.
- **ORL inventory (volatile observed evidence, dated read):** 8 organisations, 5 aliases, 9 platform accounts, 21 identity-evidence observations, 2 accepted organisation–event links and 1 future event carrying an ORL link. This is proven starter plumbing, not broad inventory coverage — the intake and reconciliation taps are not yet connected to the wider catalogue. Organiser Gap and ORL are therefore not yet a continuous workflow; a separate read-only review is assessing how gap clues should enter ORL as the single evidence and approval authority.
- **Planned correction, not completed work:** the newly added organiser-resolution host matcher is provisional intake assistance only; a host-only match cannot establish canonical identity or a relationship. Where a host maps to several clubs, or is a multi-tenant, social or registration platform, it must not choose the first club or manufacture a deterministic organiser conclusion. Ambiguous evidence is never discarded: it is retained as typed candidate evidence and routed to ORL reconciliation, creating candidate/review work rather than an unsupported conclusion. Unknown remains preferable to an unsupported conclusion. Direct legacy organiser backfill must not be run broadly as a substitute for ORL reconciliation without separate review and approval.
- **Projection boundary:** the public events row remains a projection and operational record. It is never overwritten directly from a host match; applying reviewed ORL conclusions to public fields or gates is a separate audited and approved step.
- **Repository observation:** Lovable and GitHub were verified synchronized at commit `d310fe0eee47c4865a3c294b5d292f9be28d4113` before this documentation checkpoint. Commit references are dated observations, not permanent state.
- **Traffic caveat (observed, September 2026):** recent Lovable analytics showed a large direct/desktop anomaly against the earlier Google/mobile profile. Exclude bots, monitoring and measurement changes before drawing any demand or commercial conclusion from that traffic.

### Planned workstreams and sequencing

1. **Data and communication eligibility.** A record is communicable only with stable occurrence identity, confirmed date/status, typed canonical entry destination, entry state with opening/closing evidence where known, source/provenance, last verification, and accepted organiser identity where organiser communication is involved. Full-catalogue perfection is not a prerequisite; ineligible or uncertain records go to an exception queue.
2. **Reminder Operations manual proof.** request → immediate confirmation → real-time admin notification → visible operational task → link/timing verification → schedule → preview/manual send → delivery, suppression, failure and retry → click and explicitly labelled self-reported outcome. Every action audited; no silent disappearance, duplicate send or unsafe link.
3. **Controlled automation only after the manual loop passes acceptance.** Automate deterministic eligible cases, escalate uncertainty, and retain a kill switch, idempotency, capped retries and visible failures.
4. **Organiser relationship and ORL.** Event-level reminder demand becomes aggregated opportunity evidence with no runner identities disclosed. Organiser relationships resolve through ORL; the gap page is intake and proposal evidence, never a parallel canonical organiser system. This integration stays review/planned work until separately approved.
5. **Shared communications infrastructure.** Email first, social later, on the same verified facts, eligibility rules, scheduling, approvals, delivery/publication status, failure handling and audit history. Initial social automation produces drafts for approval; no raw-feed-to-public automation.
6. **Measurement.** Keep request, confirmation, scheduled, sent, delivered, failed, clicked and self-reported-entered as separate states. Clicks remain hand-offs, not entries. Measure verification time, eligible proportion, successful delivery, failure/retry and repeat behaviour before any commercial claim.
7. **Commercial and copy work stay downstream.** Prove the operational flow first. Race-specific transactional consent cannot be repurposed for newsletters or marketing; broader alerts need separate explicit optional consent. Accuracy and corrections remain free, and no organiser can buy factual authority.

### Bounded immediate implementation package (not authorised by this document)

Scope: real-time admin notification for new reminder requests; a Reminder Operations queue and state model; event/link eligibility and verification; manual preview/send; correction of failed-send completion semantics; retry, idempotency, suppression and unsubscribe audit; organiser opportunity aggregation without PII; and a controlled test matrix covering verified-open link, future opening, unknown state, changed/cancelled event, queue failure, duplicate attempt, and suppressed/unsubscribed address.

Acceptance: every signup creates visible work; no silent loss; no duplicate send; no unverified link sent; failure remains actionable; unsubscribe and suppression work; all actions auditable. Separate approval, rollback, tests and production acceptance still apply.

### Active order from 18 September 2026

1. PX0 canon and baseline verification continues.
2. **Reminder Operations manual proof (new, runs in parallel):** the bounded package above, manual and fail-closed.
3. **Bounded organiser/data rectification (parallel):** eligibility-focused correction, ambiguity-safe organiser resolution and the ORL-intake review. Total database cleanup is explicitly not a prerequisite for communicating about a safely eligible subset.
4. PX1 QL2 onward read-only evidence and existing-schema previews, through separate gates.
5. PX2 Explorer and authorised course work; PX3 evidence-led expansion; PX4 distribution; PX5 day-120–150 gate — unchanged.

Kent and South London remain offline.
