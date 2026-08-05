# RENM — Data and Lifecycle Contract Draft

Status: decision draft. It translates the trust goal into enforceable data behaviour.

## 25 July 2026 research-package acceptance rules

The Kent and South London pilots establish a mandatory distinction between **package structural acceptance** and **RENM production promotion**.

A structurally accepted research package must have:

- immutable raw/original inputs and append-only evidence;
- global stable entity and edge identifiers;
- one composite-unique mapping row per source identity;
- every mapping target resolving to an existing final entity/edge;
- one unique typed relationship edge per subject, object, role and validity period;
- every original relationship represented exactly once, while multiple evidence observations may support it;
- controlled role, lifecycle, date, entry, verification and accessibility vocabularies;
- typed destination roles, with `entry` stored separately from current `entry_state`;
- unknown entry states retained with reason, checked date and recheck instruction;
- residual uncertainty distinguished from an unresolved decision;
- validation of references between mapping tables as well as core entity tables;
- byte-identical immutable originals across derivative packages; and
- independent verification of the agent’s validation report.

Structural PASS permits staging and live-database reconciliation only. It does not assign G2/G3/G4, make an event discoverable, prove current source presence or authorise a public CTA.

Accepted candidate-package status on 25 July 2026:

- **Kent & Medway:** final normalised candidate package accepted. Entry review coverage is 57/57: 21 open, 23 closed, 11 unknown, one sold out and one opening later. There are 27 resolved collision decisions with residual caveats and 120 other open conflict-queue rows.
- **South London:** corrected candidate package structurally accepted. Entry state remains unverified across its 23 occurrences; two inaccessible high-confidence evidence items require review.

Before either package can affect production, it must be reconciled against live RENM candidates/occurrences, identity endpoints and historical clues. Proposed matches, inserts, field changes and public-gate effects must be reviewed separately. No package is a direct import feed.

## 1. Separate the dimensions currently collapsed into “ACTIVE”

Each occurrence needs independently derived dimensions:

| Dimension | Suggested values | Purpose |
|---|---|---|
| Lifecycle | ingested, scheduled, past, dormant, cancelled, terminal | What happened in time |
| Visibility gate | G0, G1, G2, G3, G4 | Where/how prominently it may appear |
| Date state | confirmed, estimated, unknown, conflicting | Whether date-dependent claims are safe |
| Canonical state | canonical, duplicate, unresolved | Whether it represents one public occurrence |
| Verification | verified, supported, stale, disputed | Strength/recency of evidence |
| Coordinate precision | venue, postcode, town, region, unknown | Which proximity claims are safe |
| Entry state | open, opening soon, waitlist, sold out, closed, cancelled, unknown | Which runner action is honest |
| Destination state | verified working, working unverified, redirected, failed, stale, absent | Whether a public action is safe |

The existing status can remain during migration, but it must stop being the sole public eligibility rule.

## 2. Minimum rules by gate

| Requirement | G0 | G1 | G2 | G3 | G4 |
|---|---:|---:|---:|---:|---:|
| Canonical identity resolved | No | Prefer | Yes | Yes | Yes |
| Confirmed future date | No | No | Yes | Yes | Yes |
| Plausible UK location | No | Prefer | Yes | Yes | Yes |
| Distance/type known | No | No | Prefer | Yes | Yes |
| Verified official-information destination | No | No | Prefer | Yes | Yes |
| Entry state represented honestly | No | No | Yes | Yes | Yes |
| Verified-open entry destination | No | No | No | No | Prefer |
| Organiser resolved | No | No | No | Prefer | Yes |
| Eligible for live count | No | No | No | Yes | Yes |
| Eligible for discovery | No | No | Limited | Yes | Yes |
| Eligible for sitemap/index | No | Usually no | Normally no | Yes | Yes |

G2 is deliberately accessible but less immediate. It protects useful inventory without letting weak records dominate search or trust claims.

## 3. Eligibility definitions

### Stored

Any retained record/evidence, including duplicates and history.

### Current/live

A canonical occurrence with a confirmed date on or after today and no cancellation/terminal evidence.

### Discoverable

Current/live plus G3 or G4. G2 may appear only in explicitly limited result areas with honest treatment.

### Countable

Exactly the G3/G4 discoverable set. The homepage language should describe this number precisely, e.g. “verified upcoming races currently discoverable,” not all stored or ACTIVE rows.

### Indexable

Discoverable plus a page that passes existing duplicate, orphan, past and content-quality rules. Indexability is not automatic merely because a record is discoverable.

### Enterable now

A current canonical occurrence whose entry state is verified `open` and whose typed entry destination is verified appropriate and working. Enterability is a subset of live inventory, not a visibility gate.

### Successfully resolved intent

A runner receives and uses the correct action for the observed state: enter, waitlist, official information, confirmed reminder, or clear closed/cancelled treatment. Measurement must distinguish these outcomes.

## 4. Date policy

- Unknown/undated occurrences are excluded from all current discovery, counts, date/month surfaces and sitemaps.
- They enter a backfill queue ordered by expected public value, evidence availability and likelihood of recurrence.
- Never turn an estimated date into a confirmed date silently.
- Conflicting dates force quarantine or limited reference treatment until resolved.
- Recurring series history may inform a search for evidence, but must not manufacture the next occurrence.
- Backfill records: chosen value, evidence, confidence, checked_at and checker/process version.

## 5. Canonical and duplicate policy

- One real-world occurrence has one canonical public record.
- Keep all imported/source identities as private evidence records.
- Duplicate matching should combine normalized identity, date/date range, venue/geography, organiser and series—not name alone.
- Auto-merge only above a conservative threshold. Ambiguous matches enter a review queue.
- A retired public duplicate redirects to the canonical URL where intent matches; otherwise it is noindex/reference.
- Preserve historical slugs and mapping so repair does not create SEO loss.

## 6. Series policy

Use a parent series with child occurrences.

- The series owns stable brand/name, organiser relationship, recurring location pattern and descriptive history.
- The occurrence owns date/range, venue, entry destination, edition-specific distances, prices/status and verification.
- A multi-event festival on one date can be one occurrence with distance options when there is one entry/identity.
- Separately bookable or independently scheduled races are separate occurrences linked to one series/festival.
- Series pages are useful when at least two known editions/occurrences establish continuity. Avoid thin auto-generated series pages.
- Discovery results point to the most relevant upcoming occurrence. Series pages fold past editions away by default and expose history on demand.

## 7. Source, destination and entry-state policy

- Source rows and `source_url` are private operational evidence.
- Public destinations are separately reviewed, typed relationships rather than a single preference hierarchy.
- Maintain identity/authority evidence, official-information destination, entry destination, waitlist destination and organiser-context destination independently.
- Classify provider/channel separately from role: organiser website, club website, Facebook/social profile, governing-body profile, booking provider and directory are channel types, not automatic trust ranks.
- A verified organiser- or club-controlled URL can establish identity/authority regardless of whether it offers booking. A social page can be official information when control and currency are supported, but platform access/login constraints must be recorded.
- An organiser-designated booking platform is an official entry destination even when it is not organiser-owned.
- Store destination role, provider/domain, designation evidence, last_verified_at, observed entry state, HTTP/redirect outcome, confidence and recheck_due_at.
- `Enter now` requires a verified-open state and verified entry destination. A future occurrence without open entries may still be G3/G4 when its official information and entry state are trustworthy.
- A link disappearing demotes verification and creates review work; it does not automatically delete the occurrence.
- A non-URL label or inaccessible social reference is retained as a private discovery clue, never rendered as a CTA. It creates an endpoint-resolution task.

## 8. Organiser relationship policy

Organiser, owner, host club, race director, delivery partner, registration provider, timer and results operator are separate roles. A contact or platform associated with an occurrence must not be labelled as its organiser without role-specific evidence.

Authority is claim-specific rather than entity-wide. Where implemented, material claims should be able to retain `asserted_by`, `fact_authority_role`, `observed_at`, `effective_at`, `confirmed_by`, `superseded_at` and supporting evidence. Conflicting authoritative claims remain explicit review work; source priority must not silently erase them.

Contact records used for relationship resolution or organiser discovery are private. They should distinguish `contact_role`, `contact_channel_purpose`, `commercial_outreach_permitted` and an `outreach_restriction_note` where known. A public email address alone does not establish permission or suitability for sales outreach.

- Store organiser-to-occurrence and organiser-to-series relationships explicitly, with role, evidence, confidence, valid dates and review state.
- Store organiser identity endpoints separately and allow many endpoints to resolve to one canonical organiser: domains, club pages, social profiles, booking-provider profiles, governing-body identities and aliases.
- Distinguish owner/organiser, delivery partner, race director, governing body and booking provider.
- A booking provider does not become the organiser merely because it hosts entry pages.
- Relationship discovery may traverse a verified endpoint to propose other events, venues, series, aliases and destinations. Every traversal records discovery origin, observed claim, checked time and confidence; proposed edges remain candidates until independently supported or organiser-confirmed.
- Directories and aggregators may generate candidates but do not become authority merely because they list the relationship. Respect access terms and use approved APIs/manual research where platform restrictions prevent compliant automation.
- The organiser portfolio is a real-world identity view across sources and booking platforms. It must be validated through sampled organiser review before broad automation or commercialisation.
- Organisers may claim and correct identity/relationships without paying; paid features may add workflow, analytics, promotion or syndication but cannot buy accuracy.

## 9. Coordinate policy

- Store coordinate value, derivation method, precision and verification time.
- Reject obvious default/test/out-of-country coordinates at ingestion.
- Venue coordinates support close-radius ranking and “within X miles.”
- Postcode-centroid coordinates support approximate proximity with suitable labelling.
- Town/region centroids do not support close-radius claims and rank below precise records.
- Missing coordinates can remain G1/G2 but cannot enter map/radius discovery that implies precision.

## 10. Retention proposal

### Event and evidence data

- Retain event history and provenance indefinitely by default.
- After 24 months with no renewed evidence, mark dormant, exclude from discovery/indexing and recheck at least annually.
- Treat plausible biennial events as dormant candidates, not terminal.
- Consider removing obsolete public reference pages after four years without evidence or meaningful use, while retaining the internal entity/evidence record.
- Use 410 only with confirmed terminal evidence or an approved public-retention decision.

### Search telemetry

- Raw search text: 90 days.
- Full/raw postcode: preferably do not retain; if temporarily required, generalise promptly and delete within 30 days.
- Daily-rotated hashed IP: 30 days.
- Raw user agent: 30–90 days, then category only if still useful.
- De-identified search/click relationships: 12 months.

### Reminders

- Unconfirmed subscriptions: seven days.
- Confirmed active subscription: until reminder completes or user unsubscribes.
- Completed subscription/contact data: delete or irreversibly minimise after 90 days, unless an explicit continuing relationship is separately consented.
- Delivery/audit summaries: 12 months, minimised.
- Suppression record: retain a minimal hash as long as required to honour unsubscribe/abuse prevention.

### Operations

- Admin audit log: 24 months.
- Sync run summaries and dataset-level trends: indefinite.
- Detailed successful debug payloads: 90 days.
- Failure/quarantine evidence: 12 months or until resolved plus an appropriate audit window.

These periods should receive a UK privacy review and be reflected in the public privacy notice.

## 11. Reminder contract

- Use confirmed consent/double opt-in before treating an address as subscribed.
- Rate-limit by privacy-preserving address and network signals; prevent enumeration.
- Make subscribe responses indistinguishable whether a matching record exists.
- Use expiring, single-purpose tokens and immediate unsubscribe.
- Separate confirmation, scheduled, sending, sent and failed states.
- Never mark a reminder sent when delivery fails; retry safely with an idempotency key and capped attempts.
- Capture consent text/version, timestamp and purpose.

## 12. Access contract

- Revoke anonymous/authenticated SELECT on the base `events` table unless a narrowly justified internal route requires it.
- Public clients query only an explicitly safe projection/view or server function.
- The public projection excludes source/source_url, moderation fields, internal notes, collision state and other private evidence.
- Add regression tests proving anonymous clients cannot read private columns or non-public gates.
- Preserve current RLS protection for other sensitive tables and test it, rather than assuming configuration is permanent.

## 13. Sync and change-monitoring contract

Each automated or manually triggered sync records:

- source, trigger mode and logical parent run ID; start/end; code/parser version; child/chunk IDs where applicable;
- fetched, parsed/eligible, processed existing, materially changed, inserted, unchanged, duplicate, quarantined, source-missing and failed counts;
- unexpected deletion/drop percentage and field-completeness deltas;
- the source identities observed in the run, their matched canonical occurrence IDs, sampled field-level changes and error classes;
- whether publication gates changed;
- operator review/acknowledgement when anomaly thresholds fire.

No sync may turn weak evidence directly into a G3/G4 public claim without passing the same rules as all other data.

For every source identity/occurrence match, persist `first_seen_at`, `last_seen_at`, `last_seen_run_id` and `last_material_change_at` (or equivalent observation history). An upsert of an identical row is `processed_existing`/`unchanged`, not `updated`. A chunked import is operationally one logical run: publication-impact and anomaly decisions use the combined result, and a failed/missing chunk makes that logical run partial until reconciled.

Absence from a successful, complete source run never deletes the occurrence. It creates a reversible `source_missing` observation and recheck/review work. A missing observation must be distinguished from affirmative cancellation, closure or deletion evidence. Discovery treatment is risk-based: a future occurrence may retain a limited grace period while being rechecked, but it cannot remain indefinitely described as currently source-verified. No absence inference is permitted from a partial/failed run or from a source whose coverage window is not understood.

Monitor material public-state changes between syncs/runs where feasible: entry opening/closure, waitlist/sold-out state, cancellation, date/venue change, broken or redirected destinations and booking-provider migration. Changes create evidence observations and review/action work; they do not overwrite history without trace.

### 13.1 Observed Scottish Athletics behaviour — 24 July 2026

A supervised run fetched 152 source rows, classified 105 as eligible, skipped 12 duplicates and submitted 93 existing records for upsert. It inserted none and completed successfully in 6.558 seconds. The live `scottishathletics` population stayed at 145. Independent row-level comparison found one material change (latitude/longitude added to The Great Carradale Canter) and 92 data-identical upserts. The prior successful run reported 110 eligible rows, but the five-row reduction created no absence/deactivation/review evidence. This validates the need for the observation and metric rules above; current `updated_existing` is a processing count, not a material-change count.

### 13.2 Observed England Athletics behaviour — 24 July 2026

A supervised run completed four separately logged chunks with no failed pages. Combined totals were 638 fetched/eligible, 198 duplicate skips, 439 writes, 18 inserts and 421 existing upserts. The live `england-athletics` population rose from 1,473 to 1,491 and no stored row disappeared. Independent comparison found one material existing-record change—Woodstock 12 & 4 2026 changed from 29 November to 8 November—and 420 data-identical existing upserts. The preceding run fetched 641, but neither run retained a source-identity manifest, so the changed feed membership cannot be reconciled safely.

All 18 inserts entered the live table as `ACTIVE` without a completion/publication gate and without organiser identity. Fleetwood Half Marathon received `www.fyldecoastrunners.com` and Power of 5K Race 1 received `Facebook Page - Power of 5K` as `entry_url`; neither is a valid absolute HTTP destination. Warrington Running Festival and Everton 10k received the generic RunThrough homepage rather than event-specific destinations. Material date changes, malformed destinations and source-membership changes must therefore create evidence/review work before they silently alter the trusted public state.

## 13.3 External research-intake contract

Regional research, browser-agent findings, social review and third-party datasets enter an evidence staging area, never canonical/public tables directly. A delivery is acceptable only when:

- every entity has a global stable identifier or an explicit unresolved candidate identity;
- every foreign key resolves, every primary key is unique and every referenced evidence ID exists;
- one typed organiser/entity relationship edge exists per unique entity pair/role/validity period, with one-to-many evidence observations rather than duplicated edges;
- organisation, identity endpoint, programme, series, occurrence, venue and destination are not collapsed into one record type;
- occurrence dates are machine-valid dates; recurrence text is stored as a schedule/programme rule;
- lifecycle, confirmation/date state, entry state, relationship role, source class and confidence use approved enums and definitions;
- `entry open` is an observed state with verification time and destination, not inferred from the presence of a registration-looking URL;
- confidence is claim-level and reflects actual access/evidence quality; snippets, inaccessible pages and timed-out extraction cannot silently inherit first-party certainty;
- social endpoints and third-party directories remain typed evidence/candidate channels with access constraints recorded;
- a validation report includes duplicate IDs, unresolved references, duplicate edges, invalid URLs/dates, enum violations, candidate/public-gate counts and network-specific distortions.

Research ranking uses unique, in-scope, upcoming occurrences; expected runner value; evidence weakness; and verification cost. It must not rank portfolios by raw evidence-row count, repeated relationship assertions or network size alone. Large recurring networks such as parkrun are segmented from entry-based races and use their own recurrence/registration semantics.

Research packages are reconciled against the existing RENM clue inventory before new canonical entities are created. Raw values are preserved; normalised endpoints, alias matches and proposed portfolio edges are additive candidates. Facebook/manual-social review is a separate controlled queue. No correction round may delete raw claims or collapse unresolved conflicts by convenience.

Observed pilot evidence on 24 July 2026: Kent delivered useful role discovery but contained duplicate organiser identity, unresolved foreign keys and no supplied evidence ledger. South London supplied a complete evidence ledger and clean foreign keys, but 151 relationship rows reduced to 125 unique edges, controlled state vocabularies diverged, cross-region entities received different IDs and parkrun evidence volume distorted portfolio ranking. Both packages remain candidate evidence only.

## 14. Analytics and commercial-attribution contract

Outbound hand-off, booking start, completed registration and organiser value are separate outcomes. RENM must not represent an outbound click as an entry or revenue event. Commercial organiser evidence must state the measurement period, occurrence, destination, event definition, exclusions and known limitations.

Where an organiser-control or distribution pilot is tested, maintain a destination-specific manifest containing the external record identifier where known, distribution method, authority/authorisation basis, delivery state, last attempted time, last confirmed time and error or review reason. A successful RENM update is not evidence that an external destination changed.

Participant-level booking or results data must not be collected merely to prove attribution. Prefer privacy-preserving aggregate reconciliation, campaign identifiers, referral codes or an authorised provider callback with documented minimisation and retention.

- Application head `9558063` replaced the ambiguous custom `Entry Click` emission with `Outbound Click`. Historical `Entry Click`, current `Outbound Click` and Plausible automatic outbound tracking are separate series and must not be summed or backfilled into one another.
- Track typed actions explicitly: Entry CTA Viewed, Outbound Click, Entry Destination Failed where observable, Reminder Started/Confirmed/Sent/Clicked, Search Results Shown/Zero/Clicked, Organiser Portfolio Viewed, Claim Started/Submitted and Correction Submitted.
- Automatic `Form: Submission` is diagnostic only and cannot stand in for reminder or organiser conversions.
- Outbound Click properties should include canonical occurrence, organiser, series where known, destination role/provider, entry state, verification-age bucket, visibility gate and experiment/campaign ID. The current analytics-only `destination_role` is a conservative first step, not the public/data-layer destination model.
- Completed-entry and revenue attribution are recorded only when RENM controls the booking funnel or an organiser/provider supplies a lawful, agreed conversion signal.
- RENM-owned events use the same public gate/ranking rules but may carry an internal `founder_event_experiment` marker for measurement and disclosure.
- Experiment reports distinguish organic inclusion, clearly labelled promotion and other acquisition so RENM does not mistake self-preferencing for product-market fit.

## 15. Initial migration mapping

Do not mass-reclassify solely from `status`. First compute proposed gates into a shadow field/view and inspect samples.

- The two exact public test records → G0 quarantine immediately after approval.
- `duplicate_of IS NOT NULL` → non-canonical/private evidence; validate redirects before public retirement.
- ACTIVE + canonical + past date → past/reference, not live/countable.
- ACTIVE + canonical + no date → date-backfill/reference, not discovery.
- Future canonical but missing verified official information/location essentials → G2 or G0 based on severity.
- Future canonical meeting the approved rule → G3; promote to G4 only with richer verified evidence.

Recompute every public count, discovery query, sitemap and SEO rule from the new eligibility contract before changing homepage claims.
