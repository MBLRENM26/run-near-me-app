# RENM — Interactive Race Explorer product reset

Status: approved operating reset on 7 August 2026. This document authorises the strategy, documentation reset and preparation of bounded work packages. Application, schema, production-data, integration and deployment changes remain separately approval-gated.

## Decision

RENM will test whether its existing race catalogue can become a deeper runner decision product rather than continuing to present primarily as a flat directory of landing pages. L3B-5B and the previous implementation sequence are paused while this product direction is designed and tested.

The retained acquisition journey is:

`Google / AI / direct → indexable RENM landing or event page`

The proposed product journey is:

`landing or event page → interactive Race Explorer → compare / save / monitor → correct entry, information or results destination`

This is a hypothesis to validate. It is not evidence that an interface redesign will create retention, completed entries, organiser value or revenue.

## Product premise

OpenRouter is a useful interaction reference because it turns a large catalogue into a decision surface: global search, faceted exploration, comparable records, rankings, activity, detailed metrics and cross-linked routes. RENM should adopt that composition principle, not OpenRouter's visual identity, technical density or AI-routing business model.

RENM remains a runner-facing discovery, intelligence and routing layer. It does not become a booking platform, timing system or unrestricted copy of third-party race results.

## Operating thesis and time box

RENM will be run as a focused 120–150 day product experiment rather than an indefinite build. The experiment will:

1. contract the immediate scope to trustworthy UK race intelligence;
2. rectify canonical identity, edition, distance, destination and source synchronisation;
3. present the catalogue as an interactive, comparable data product;
4. expand useful data through authorised direct feeds and bounded partnerships;
5. distribute data-led content consistently through search and social channels; and
6. decide from measured behaviour whether to continue, narrow, maintain as a pet project, open-source selected components or stop major investment.

The experiment is successful only if improved data and presentation produce evidence of discovery, return usage, results demand, partner participation or attributable runner action. Time spent and shipped features are not success measures.

## Strategic wedge

The lead product is **trusted UK race intelligence**: verified occurrences, comparable courses, connected editions, authoritative next actions and post-event results resolution. RENM is not trying to win as a generic running community, training platform or flat event directory.

The defensible asset to test is the combination of:

- one canonical race-series/edition/race graph;
- field-level source, freshness and confidence;
- reliable changes and corrections rather than periodic blind overwrite;
- comparable course, entry, results and practical data;
- useful search, comparison and return journeys; and
- a rights-aware bridge to organisers, governing bodies, registration providers, timers and runner-authorised activity platforms.

## Data and partnership hierarchy

Partnership work follows the authority needed for each claim. A platform's size does not make it authoritative for every field.

| Priority | Partner/source class | Intended contribution |
|---|---|---|
| 1 | Governing and licensing bodies, beginning with England Athletics RunEvents | Stable licence/event identity, licence state, dates, organiser context, official destinations and result-link continuity |
| 2 | Registration marketplaces and providers | Structured edition/race data, entry state, price, capacity where permitted, organiser identity and attributable registration destinations |
| 3 | Timing and results providers | Authoritative result state, result-set identity, chip/gun semantics, splits, corrections and permitted aggregates |
| 4 | Organisers and clubs | GPX/course, facilities, cut-offs, accessibility, images, local changes and confirmation of relationships |
| 5 | Open-licensed public infrastructure | Club/session opportunity data, geography, mapping and weather enrichment under the applicable licence |
| 6 | Runner-authorised platforms such as Strava and Garmin | User-owned activity, claimed participation, personal history and course delivery; never the unauthorised race catalogue backbone |

Every partnership begins with a small read-only pilot and a written data-use boundary: supplied fields, stable identifiers, update method, cache/storage rights, public display rights, attribution, corrections, deletion/withdrawal handling and termination behaviour. RENM should return measurable referral traffic, correction feedback and aggregated demand insight without claiming registrations it cannot observe.

### Platform posture

- **Strava:** use as an optional runner-authorised enrichment and distribution channel, not as the primary event feed. Do not depend on club-member/activity endpoints or build a feature that replicates Strava. A future pilot may match a consenting runner's activity to an RENM occurrence or claimed result.
- **Garmin:** investigate after official GPX/course data exists. The useful runner feature is course delivery to Garmin Connect/devices and, later, consented activity matching—not a decorative account connection.
- **England Athletics:** the first direct-data conversation. Request a stable identifier, change feed/export, licence/status fields, official result destinations, permitted display/storage terms and a small road/multi-terrain pilot.
- **Registration and timing providers:** pursue one provider and one timer before designing a general integration estate. The first integration must prove freshness, match quality and runner value.

### Build platform and graduation posture

Lovable is RENM's validation and incubation platform for the evidence window, not an assumed permanent infrastructure commitment. Do not migrate pre-emptively: the current platform remains useful while the product, data contract and demand are being proved.

Build the experiment so success does not create a forced rewrite:

- GitHub remains the source of truth for application code and governed documentation;
- database schema changes remain explicit, versioned and reproducible;
- canonical data, source records and media remain exportable in documented formats;
- ingestion, synchronisation and partner adapters remain separable from presentation code;
- core race, eligibility, provenance and conflict rules must not exist only inside platform-specific prompts or opaque workflows; and
- analytics definitions, configuration, secrets ownership and deployment dependencies remain documented and portable.

Platform graduation is approved only when measured success or a demonstrated constraint justifies it. Evidence can include sustained production traffic, multiple automated feeds and background jobs, server-rendering/SEO or performance needs, stronger CI/CD, observability or security requirements, or material cost/deployment limitations. Graduation may move the frontend or hosting first while retaining Supabase/Postgres if that remains the right data platform.

The operating rule is: use Lovable to prove RENM; if RENM proves itself, graduate it deliberately rather than rebuilding it in a panic.

## Synchronisation and rectification contract

No new source is allowed to become another scrape-and-overwrite path. Before scale work, each material fact must be able to retain:

- source and source-record ID;
- source-observed and source-updated timestamps;
- field-level provenance, confidence and verification state;
- applicable licence, permission or contractual basis;
- source priority for that specific claim;
- conflict and correction history;
- last-seen and last-material-change state; and
- reversible source-missing treatment.

The canonical shape is `series → edition/occurrence → race/distance → course, entry offer, result set and source records`. Source rows converge on these entities; they do not create duplicate public events by default.

## Runner jobs

The MVP must support four connected jobs:

1. **Discover:** find plausible races without knowing an event name or navigating category pages.
2. **Decide:** understand why a race matches and compare practical differences.
3. **Act:** reach the correct verified entry, official-information, waitlist or results destination.
4. **Return:** save a shortlist or search and return when an event changes or results appear.

## MVP interface

### 1. Persistent Race Explorer

- One primary search surface accepting a place/postcode/event plus visible structured criteria.
- Shareable URL state for location, radius, date range, distance, terrain, governance and race profile.
- Immediate result count and active-filter chips.
- Sort by relevance, date and travel distance; price/popularity only when the underlying data is reliable enough.
- Card and compact comparison views; map view is conditional on coordinate quality.
- Mobile-first controls that do not require a wide desktop table.
- Honest limited-data treatment rather than silently excluding every incomplete record.

Natural-language input is optional after the structured version works. It must translate into visible filters and never invent a race attribute.

### 2. Decision-rich result cards

Every card should answer three questions:

- What is it?
- Why does it match?
- What can I do next?

Initial card content can use existing fields: name, date certainty, place, travel distance, distance, terrain, governance, organiser type, race profile, recurring state and a verified destination. Fee appears only where current and appropriately labelled.

### 3. Compare

- Select up to three races.
- Compare the same supported dimensions side by side.
- Unknown values remain `Unknown`; absence is not scored negatively unless the data contract supports that interpretation.
- Comparison links back to the canonical event occurrence.

### 4. Event intelligence page

The occurrence page remains canonical but becomes a structured record with sections for overview, course, practicalities, entry state, previous editions, results and similar races. Sections appear only when supported.

### 5. Results resolution

The MVP does not ingest every individual runner result. It indexes the result state and authoritative destination:

- results expected / published / not found / unavailable;
- official results URL and provider;
- event year and distance/category coverage;
- checked and published timestamps where evidenced;
- aggregate field size and summary statistics only where reuse is permitted;
- links between an occurrence, prior editions and the next known edition.

Runner-level result ingestion requires a separate rights, privacy, identity-matching and source-quality decision.

## Existing data map

| MVP need | Existing RENM support | MVP treatment |
|---|---|---|
| Name and canonical occurrence | Present | Reuse after current canonical/duplicate rules |
| Date and date certainty | Present | Reuse with explicit estimated/unknown treatment |
| Town, county, region, coordinates | Present with variable precision | Reuse; audit precision before tight-radius/map claims |
| Distance | Structured tags plus text | Reuse; expose selected tags |
| Terrain | Structured tags plus discipline | Reuse; expose selected tags |
| Governance/permit | Structured enum, incomplete | Reuse as evidence-backed filter, not a quality score |
| Organiser type | Structured enum, incomplete | Reuse where supported |
| Race profile | Structured enum, incomplete | Reuse where supported |
| Entry fee | Free text and potentially stale | Show only with age/source treatment; do not sort initially |
| Entry/organiser destination | Present but role/state verification incomplete | Continue honest destination treatment; L6 remains relevant |
| Series/recurrence | Partial support | Use conservatively; do not infer edition relationships |
| Search and outbound analytics | Present | Extend with Explorer-specific events |
| Course elevation/profile | Absent | New enrichment programme, not MVP blocker |
| Facilities/accessibility/cut-off | Absent | New structured fields after evidence/source design |
| Results provider/state/link | No canonical model | First bounded new data package |
| Result rows and athlete identity | Absent | Explicitly outside MVP |

## High-value data after the MVP

Prioritise comparable, decision-changing fields rather than generic prose:

1. course elevation gain and flat/rolling/hilly classification;
2. surface composition and technicality;
3. course certification and measurement status;
4. cut-off, walker friendliness, age limits and accessibility;
5. capacity, entry-open/sold-out state and price verification;
6. previous finisher counts and permitted aggregate time distributions;
7. start waves, parking, public transport, toilets, bag drop and water stations;
8. GPX/course map and location precision;
9. results provider, publication state and previous-edition archive;
10. freshness, verification age and confidence for every material claim.

Potential later derived views include beginner-friendly races, likely PB courses, strongest repeat participation, popular club races, newly published results and comparable prior editions. No qualitative label is published until its calculation and evidence are reviewable.

## Results ecosystem constraints

UK results are distributed between governing/rankings services, organisers and timing providers. A link being public does not establish permission to copy or republish the underlying result rows. Before any ingestion, determine:

- who owns or licenses each result set;
- whether an API/feed or linking agreement exists;
- permitted storage, republication and retention;
- runner identity, correction and deletion handling;
- stable event/edition/distance identifiers;
- chip versus gun time semantics, disqualifications and incomplete results;
- matching confidence between the results event and the RENM occurrence.

### England Athletics follow-up prompts

- Is there an authorised event/results API, feed or data-sharing route for third-party discovery products?
- What identifiers persist between permitted-event listings, Power of 10/results and later editions?
- Which event and aggregate result fields may be stored and republished, and under what terms?
- Can RENM index official result destinations without copying athlete-level data?
- How are corrections, withdrawals, disqualifications and privacy requests propagated?
- Which timing providers submit into the governing ecosystem, and can their result URLs be exposed consistently?
- Is a small pilot possible for a defined cohort of permitted road races?

## Experience architecture

The current SEO pages remain but become entrances to one interaction model:

- distance page → Explorer with distance selected;
- city/county/region page → Explorer with location selected;
- terrain/taxonomy page → Explorer with relevant filters selected;
- event page → save, compare, previous results and similar races;
- post-event search → correct year-specific occurrence and results state.

The Explorer and landing pages must share one query/eligibility contract. This increases the importance of deterministic, safe public data, but it changes the order in which remaining infrastructure work is justified.

## Measurement

The MVP must distinguish exposure from useful behaviour:

- Explorer opened;
- search criteria applied;
- results shown and zero-result state;
- filter or sort used;
- comparison started and event added/removed;
- race saved and saved search created;
- event detail opened from Explorer;
- results destination opened;
- entry/official destination opened;
- return within 7/30 days where measurable without invasive identity tracking.

No event is described as an entry, registration or organiser value without external evidence.

## Revised 120–150 day delivery order

### PX0 — Reset and preflight (current)

- Install this operating thesis in the canonical documentation.
- Re-verify application head, production state, analytics baseline and existing uncommitted work before code resumes.
- Inventory current fields, sources, duplicate/identity conflicts and synchronisation behaviour.
- Prepare one data-partnership brief and the England Athletics follow-up.
- No application, schema, production-data, external integration or deployment change.

### PX1 — Contract and rectify

- Finalise the series/edition/race/result/source contract and source-authority matrix.
- Repair source identity, material-change detection, source-missing treatment and conflict queues in separately approved packages.
- Define the safe public query contract and representative performance tests.
- Establish a reproducible analytics and Search Console baseline.

Exit evidence: the selected pilot inventory reconciles, material changes are distinguishable from unchanged upserts, and every displayed material field has a defined source/freshness treatment.

### PX2 — Explorer vertical slice

- Deliver one feature-flagged, mobile-first Race Explorer route with a bounded filter set, comparison and honest missing-data states.
- Preserve existing indexable routes and use them as pre-filtered acquisition entrances.
- Enrich occurrence pages with supported course, edition, source and results sections only.
- Instrument Explorer, compare, save/return and destination behaviours without describing clicks as entries.

Exit evidence: representative runner tasks are materially clearer than the current flat journey, query performance is acceptable and the slice can be rolled back independently.

### PX3 — Direct-data and results pilots

- Run one governing/registration feed pilot, one timing/results pilot and a small organiser-supplied course cohort.
- Store result link/state/provider/checked time before named result rows.
- Add permitted field size and aggregate distributions only when the agreement and semantics support them.
- Consider Garmin course delivery only after route provenance and quality are established; consider Strava only for runner-authorised activity.

Exit evidence: at least one automated authorised feed and two useful partner/organiser pilots improve freshness or coverage without introducing unresolved public conflicts.

### PX4 — Distribution and return

- Publish a consistent data-led search/social programme: weekend radar, newly opened entries, race comparisons, course profiles and post-event result recaps.
- Generate repeatable branded video/map templates from RENM data; avoid generic AI content that is not anchored to a useful page.
- Send every campaign to a specific deep link with campaign attribution.
- Test local shortlist/saved search before account-backed alerts; reminder automation remains separately governed.

Exit evidence: campaigns create attributable qualified visits, result lookups, saves/returns or destination actions rather than impressions alone.

### PX5 — Continue, narrow or stop

At day 120–150, review the evidence without moving the threshold retrospectively. Provisional continuation signals are:

- approximately three times the current monthly visitor baseline, or a sustained equivalent growth trajectory;
- improving organic clicks and useful deep-page landings across two consecutive months;
- measurable repeat usage, results-resolution demand or saved/return behaviour;
- at least one authorised automated source and two partner/organiser pilots;
- high freshness and low unresolved-duplicate/conflict rates in the scoped inventory; and
- attributable registration, official-information or results activations with known limitations.

If the combined signal remains weak, stop major investment. Preserve the live pet project if inexpensive, and separately decide whether to package, license, sell or open-source the canonical-data, ingestion, Explorer or content components.

If the combined signal is strong, assess platform graduation against the documented portability posture and observed constraints. Success does not automatically require a full-stack migration, and migration is not itself a success measure.

### Resumption gate for prior infrastructure work

L3B-5B, L3C and later packages are not cancelled. Resume only when a named Explorer, security or lifecycle dependency justifies them. L4 shared eligibility and L6 destination role/state are likely dependencies; their exact order follows PX1 evidence.

## MVP exclusions

- No booking or payment handling.
- No organiser portal.
- No AI chat dependency.
- No runner-level results warehouse.
- No scraping programme without source/rights approval.
- No public reviews, subjective race scores or unverifiable `best` labels.
- No broad redesign of every legacy page before the vertical slice is validated.
- No new SEO inventory solely to support the concept.

## Review gates

Before code or schema approval, Mike must be able to decide:

1. Does the Explorer make finding and comparing races materially clearer than the current homepage?
2. Which existing fields are reliable enough to show and filter today?
3. Is results resolution part of the first vertical slice or a parallel pilot?
4. Which one or two runner cohorts should the MVP serve first?
5. What evidence after deployment would cause RENM to continue, revise or stop this direction?

The answer to question 5 is now time-bounded: the formal evidence gate occurs after 120–150 days, using baselines fixed during PX1 and reported even if negative.
