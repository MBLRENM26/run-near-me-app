# RunningEventsNearMe — Project Knowledge Draft

Status: current master context. Installed in Lovable during Phase 0; subsequent operational decisions remain governed by the decision register.

## Historical context-reset evidence — 25 July 2026

- This section records the pre-Phase-0 evidence state. Phase 0 knowledge control has since been installed; the current operating kernel governs immediate state.
- Kent & Medway and South London have demonstrated that external research can recover organisers, portfolios, series, occurrence dates, entry destinations and relationship roles that are absent or poorly connected in the live dataset. They also demonstrated that agent-generated PASS reports are insufficient without independent cross-table validation.
- The accepted Kent candidate source is `kent-medway-candidate-evidence-reviewed-normalised-final`. It contains 71 organisations, 64 series, 57 dated occurrences, 110 typed relationship edges, 222 destinations and 224 evidence observations/raw claims. All 57 occurrences were reviewed for entry state: 21 open, 23 closed, 11 unknown, one sold out and one opening later. The 11 unknowns are deliberate and carry reasons/recheck instructions.
- Kent’s targeted 27 collision decisions comprise 23 identity merges and four relationship-only corrections. They are operationally resolved but retain 27 explicit residual uncertainties. A separate 120 rows in the wider conflict queue remain open; the collision pilot did not resolve every research conflict.
- The accepted South London corrected package remains candidate-stage and structurally sound, with clean relationship integrity and cross-region identity alignment. It has not received the same entry-state verification pass as Kent; its occurrence entry states remain unknown and two high-confidence inaccessible evidence items remain review work.
- Neither package has passed RENM production G2/G3/G4 promotion or reconciliation against the live database. Structural package acceptance means the evidence can enter staging/reconciliation, not discovery.
- This evidence did not authorise production import or a broad organiser product. Those boundaries remain unless a later explicit decision changes them.

## Operating product reset — 7 August 2026

RENM will run a 120–150 day evidence experiment focused on trusted UK race intelligence. The operating order is: contract the scope, rectify canonical and synchronisation defects, ship a bounded interactive Race Explorer, add authorised direct data, distribute data-led content and decide from fixed continuation signals whether to continue, narrow or stop major investment.

OpenRouter is the interaction reference, not a visual template or business-model copy. RENM should turn a fragmented catalogue into an explorable decision surface with persistent search, comparable records, detailed metrics, connected editions, results state and visible source freshness. Existing indexable occurrence and landing pages remain acquisition routes into that experience.

The preferred data backbone is governing/licensing bodies, registration platforms, timing/results providers and organisers under explicit use terms. Open-licensed infrastructure may enrich it. Strava and Garmin are optional runner-authorised enrichment or course-delivery channels; neither may become an unauthorised substitute for the canonical race catalogue.

Every implementation remains bounded, reversible and separately approved. The reset approves strategy, documentation and preparation—not an unreviewed application, schema, production-data, external-integration or deployment mutation.

Lovable is the validation/incubation platform for this evidence window, not an assumed permanent home. GitHub remains source of truth; schema migrations, canonical data, integration boundaries, analytics definitions and configuration must remain reproducible and portable. Do not migrate pre-emptively. Assess deliberate platform graduation only when sustained traffic, automated feeds/background work, SEO/performance, CI/CD, observability, security, cost or deployment constraints demonstrate the need; frontend/hosting may graduate without replacing Supabase/Postgres.

## Product identity

RunningEventsNearMe (RENM) is a trusted UK race-intelligence, discovery, comparison and action-routing service. It resolves fragmented event information into canonical series, editions, races, destinations and result states, then presents them as one explorable public decision layer. Its ambition is to become the most trusted, useful and complete public map of UK running opportunities, beginning with races and their results history.

RENM helps runners discover events, understand their current state and leave for the verified official information, entry or waitlist destination. The platform does not ordinarily sell entries, take payment or replace organisers, governing bodies, parkrun or booking platforms. Any event related through ownership or control to RENM or its operator must be disclosed and receive no unlabelled ranking, trust or data-quality advantage.

## North star

Trustworthiness outranks raw inventory, traffic and feature volume. The primary product outcome is **successfully resolved runner intent**, not a click at any cost.

Every product, data and SEO decision should improve at least one of:

1. Whether a runner can trust that an event exists, is current and is represented accurately.
2. Whether a runner can find the right event for their date, place, distance and preferences.
3. Whether RENM can explain, privately and operationally, why it believes a record is correct.
4. Whether an organiser can recognise the listing as fair and useful.
5. Whether RENM provides the correct next action for the occurrence's real entry state.

Successfully resolved intent includes a verified activation of a booking destination when entries are open, a verified waitlist action when applicable, a confirmed reminder when entries are not yet open, an official-information visit where entry is unavailable, or clear cancellation/closure information. `Outbound Click` is the current hand-off signal, with `destination_role` used to separate booking, ballot/waitlist, official-information and unknown destinations; it is not evidence of a completed entry and is not sufficient without destination accuracy.

## Non-negotiable principles

- Never invent event facts. Unknown is better than falsely precise.
- Stored, live, discoverable, indexable and promoted are different states.
- Undated events do not appear in current-event discovery.
- Public “live race” counts include only canonical, future, discovery-qualified occurrences.
- Organiser authority, official event information and entry destination are separate link roles. The primary CTA follows the runner's verified next action, including an organiser-designated booking platform where appropriate.
- Authority is established by demonstrated control and relationship, not by channel prestige. An official club site or organiser-controlled Facebook page may be valid identity/official-information evidence; a booking platform may still be the better entry destination. Provider type alone neither promotes nor disqualifies a relationship.
- Original seed/scrape sources and source URLs remain private. Provenance is retained internally.
- Records are not deleted merely because an event has passed or temporarily disappeared. History is an asset.
- Duplicate evidence is retained internally, but one real-world occurrence has one public canonical representation.
- Search-results pages are noindex. New indexable SEO surfaces require enough genuine inventory and differentiated value.
- Uncertain records receive reversible treatment: quarantine, limited visibility, noindex or dormant. A 410 is reserved for confirmed terminal removal.
- Outbound destination activation is the primary observed product hand-off. Completed entry, search success, reminder consent and return usage remain separate measures.
- Accuracy, basic corrections and inclusion are never pay-to-play. Payment cannot buy a higher trust gate or unlabelled organic prominence.
- LLMs, search engines, publishers and applications are distribution channels or data consumers; machine visibility must not compromise usefulness or truth for runners.
- Mobile is the primary journey.
- Changes are narrow, phased, measurable and reversible. Data repair precedes presentation claims.
- Core data and product rules must not exist only in platform-specific prompts or opaque workflows; successful validation must not force a panicked rewrite.
- No partner feed is accepted without stable identity, update semantics, display/storage rights, attribution, correction and termination treatment.
- Public availability alone does not grant permission to warehouse named runner results; begin with authoritative result state, links and permitted aggregates.
- Social and video output must be anchored to RENM data, deep-linked to a useful product journey and measured separately from vanity reach.
- External research agents and regional sweeps produce candidate evidence only. Their entities, relationships, facts and destinations cannot enter canonical or public state until they pass the same controlled schema, global identity, referential-integrity, evidence and visibility gates as every other source.

## Canonical data model

The real-world entity model is:

- **Organiser:** the canonical owner or operator where one can be identified.
- **Series:** the stable identity shared by recurring editions or a branded multi-event family.
- **Occurrence/edition:** one event at a particular date and place. Public discovery and “live” counts operate on occurrences.
- **Race/distance:** a separately comparable race within an occurrence, with its own distance, start, cut-off, entry offer and result coverage where supported.
- **Course:** the edition/race-specific route, surface, elevation, certification and practical course data, with provenance and version state.
- **Result set:** the official result publication for one occurrence/race, beginning with provider, state, destination, coverage and permitted aggregates.
- **Source record:** the partner/feed observation and stable source identity that supports claims without becoming a duplicate public occurrence.
- **Evidence:** private observations supporting identity, date, venue, status, links and other fields.
- **Destination:** a typed public link for official information, entry, waitlist or organiser context, with verification and freshness state.
- **Identity endpoint:** an organiser-controlled website, social profile, governing-body/club profile or other channel used to resolve the same real-world organisation across the fragmented web.

A source row is evidence, not automatically a separate public event. Multiple source rows describing the same occurrence must converge on one canonical occurrence. The target hierarchy is `series → occurrence/edition → race/distance → course, entry offer, result set and source records`.

Canonical identifiers are global and stable across regions, sources and research runs. A graph relationship is one unique typed edge between canonical entities and may have many supporting evidence observations; repeated evidence must not create repeated edges. Programme/recurrence rules, series and dated occurrences are distinct concepts. Dates contain dates, not schedule prose.

## Link and action doctrine

Maintain three separate concepts:

1. **Identity/authority:** who establishes that the occurrence and its facts are genuine—normally the organiser, supported where relevant by a governing body or other official evidence.
2. **Official information:** where a runner can read current official details.
3. **Next-action destination:** where a runner can enter, join a waitlist or take the appropriate action now.

An organiser-designated Eventrac, SiEntries, RaceBest, EntryCentral, Sport:80, JustGo, Enthuse or similar page can be the canonical entry destination even when the organiser has a separate website. `Enter now` appears only when entries are verified open and the destination is appropriate. Otherwise show honest official-information, waitlist, closed, cancelled or reminder treatment. Link provenance, designation and confidence remain private even when the destination is public.

Facebook-only and club-site-only organisers are legitimate candidates. A textual label such as `Facebook Page - Power of 5K` is not itself a usable destination, but it is a research clue that should enter entity-resolution work rather than be discarded. From any verified organiser-controlled endpoint, RENM may discover candidate organiser identities, series, occurrences, venues and destinations. Discovered relationships remain private candidates until supported; expansion must not manufacture facts or turn a third-party directory into authority by repetition.

## Record visibility gates

- **G0 — Quarantined:** test data, invalid/impossible facts, unresolved collision, suspected duplicate or severe trust failure. Admin only.
- **G1 — Reference:** plausible historic, dormant or materially incomplete record. May support history or an intentional direct page; excluded from current discovery and live counts; normally noindex.
- **G2 — Limited live:** future-dated and credible, but missing enrichment or precision. Accessible and searchable where safe, ranked below complete records; imprecise coordinates cannot qualify for close-radius claims.
- **G3 — Discoverable:** canonical future occurrence with sufficient identity, confirmed date, location, distance/type, official evidence, at least one verified public information destination and honestly represented entry state. Eligible for discovery, live counts and indexing; an open entry destination is not required.
- **G4 — Trusted rich:** G3 plus organiser resolution, exact venue/date, typed official/entry destinations, strong evidence, relevant classifications and recent verification. Preferred presentation and ranking.

Gate promotion must be rule-based and auditable. Gate demotion must not destroy evidence.

## Lifecycle

Suggested occurrence lifecycle:

`INGESTED → QUARANTINED/REFERENCE/LIVE_LIMITED/DISCOVERABLE/TRUSTED → PAST → DORMANT or CONFIRMED_CANCELLED/TERMINAL`

Status, visibility gate, date state and verification state are separate dimensions. Do not encode all four in one `status` field.

An event can remain stored indefinitely while being excluded from discovery. A record with no renewed evidence for 24 months should become dormant and receive periodic rechecking; biennial events must not be assumed dead. Public removal/410 should require affirmative terminal evidence or a deliberate retention decision.

## Discovery doctrine

- Discovery requires a known future date (or explicit multi-day date range).
- Sort and filters use the occurrence date, never a guessed placeholder presented as fact.
- Estimated dates may support internal follow-up but do not qualify an occurrence for ordinary discovery unless explicitly designed and labelled later.
- Coordinates carry confidence/precision. Venue-level, postcode-centroid, town-centroid and fallback coordinates are not interchangeable.
- Exact-radius language requires appropriately precise coordinates.
- Series pages organise recurring identity; occurrence pages answer the dated-entry intent.
- Discoverable, enterable now and promoted are separate states. Public counts must name the set they actually measure.
- Entry destinations carry state and freshness. A working URL alone does not prove that entries are open.

## Audiences and distribution

- **Runners:** resolve race, date, location and next-action intent.
- **Organisers:** verify a real-world portfolio, correct relationships and understand attributable demand.
- **Machines and partners:** consume stable, safe, evidence-backed race intelligence through crawlable pages or an approved feed/API.

RENM's public website remains runner-first. An API or LLM-visibility programme is a distribution layer, not a reason to publish weak records or machine-oriented filler.

## Organiser information and distribution hypothesis — 29 July 2026

Race information is fragmented across organisers, host clubs, race directors, governing bodies, registration providers, timers, results operators and directories. These are distinct entities and roles. Authority is field-specific: an organiser may control ownership, date and public instructions; a governing body controls its licence record; a registration provider may control operational entry availability; and a timer or results operator controls its published results.

RENM is not automatically the source of truth merely because it reconciles these sources. Its plausible role is to maintain a resolved canonical public record, record which authority supports each fact, expose conflicts honestly and route runners to the correct current destination.

A potential organiser value proposition is one canonical public portfolio with authorised change distribution, conflict monitoring and attributable demand. Organisers without a durable website may also value an RENM-hosted canonical page connecting official information, entry and results destinations without replacing registration or timing platforms. These remain unvalidated hypotheses.

RENM must not build a general organiser portal, results system or universal syndication layer before manual organiser tests establish repeated use, priority destinations, feasible update routes and concrete willingness to pay. A change recorded in RENM does not imply that any external platform has accepted or applied it.

Publicly visible contact information is not automatically an appropriate route for commercial outreach. Channel purpose, explicit no-sales instructions, reasonable expectations and applicable privacy/direct-marketing requirements must be respected. Organiser contact research and prospectability decisions remain private operational data.

## Commercial doctrine

- RENM may earn from attributable referrals, clearly labelled promotion, organiser workflow/analytics, runner utilities and licensed data.
- Accuracy, inclusion, basic claims and corrections remain free.
- Sponsored inventory is visibly separated from organic relevance and never changes verification or visibility gates.
- Commercial relationships do not determine which occurrence or destination is treated as canonical.
- Related-party events are disclosed as such and use the same public trust gates and organic ranking rules as every other organiser. Any controlled commercial experiment is specified in the decision register/build brief rather than permanent Project Knowledge.
- Basic canonical identity, inclusion and corrections remain free if an organiser-control workflow is tested. Payment may support authorised distribution, conflict monitoring, analytics, promotion or attributable completed-entry generation, but cannot determine factual authority.

## Operational ownership

- Mike is the sole routine administrator. Codex may assist under Mike's instruction.
- Source synchronisation is automated on a schedule and manually supervised/triggered approximately once or twice weekly as needed.
- Every sync needs a visible run summary, anomaly thresholds and a reversible exception queue. Report separately: records fetched, eligible, processed, materially changed, inserted, unchanged, skipped, quarantined and source-missing.
- Governing-body imports are observations of source state, not authority to delete history. Each source identity must record first seen, last seen, last materially changed and the observing run. Absence from a later feed creates a reversible `source_missing`/review state; it must not remain silently equivalent to currently verified `ACTIVE` and must not be deleted automatically.
- Chunked imports must have one parent/logical run so their combined effect, partial failure and public-gate impact can be reconciled.
- Research intake uses controlled vocabularies for lifecycle, date/confirmation, entry state, relationship role, source class and confidence. Confidence attaches to the particular claim/evidence observation, not indiscriminately to an entire assembled row.
- Network inventory such as parkrun is modelled and reported separately from entry-based race inventory where its recurrence, registration and ownership semantics differ.
- Production mutations require an approved brief, phased execution and verification after each phase.
- Lovable Project Knowledge should hold this concise current contract. Historic Bibles remain an archive, not competing instruction sources.

## Privacy and safety

- Public/anonymous database access must expose only a deliberately safe projection, not private provenance or moderation fields.
- Reminder subscriptions require meaningful consent, abuse controls and reliable delivery state.
- Search telemetry is collected only for defined product purposes and has explicit retention.
- Admin remains private and minimal, with strong session, CSRF and rate-limit protections.

## Current baseline requiring correction

On 29 July 2026, a newly added admin interface exposed 23 distinct stored reminder rows spanning 17 events and subscription dates from 25 June to 29 July. One row uses Mike's controlled address, leaving 22 apparent external subscribers across 16 events. Concentration exists—four rows for one event, three for another and two for a third—but most represented events have one subscription, so the behaviour is not attributable to one traffic spike alone. All displayed `Reminder sent` values were blank. The addresses and row-level details remain private.

This is meaningful behavioural evidence of unfinished runner intent and willingness to establish a return channel, but it does not yet prove confirmed consent, email delivery, return visits or entries. The public form copy, stored consent/confirmation state, provider records, admin visibility failure and reminder delivery path must be reconciled before contacting subscribers or treating the rows as successful subscriptions.

The later code and production audit superseded the initial belief that no scheduled sender existed. Source contained a sender endpoint and a daily cron definition; production job 6 was active but its calls returned `401`, and no reminder emails were sent. On 30 July 2026 job 6 was made inactive. The HTTP endpoint now also fails closed with `503` unless `REMINDER_SENDING_ENABLED` is exactly `true`. Neither boundary may be enabled until a truthful trigger, consent, unsubscribe, retry/failure state and affected-record treatment are separately approved.

Temporary operating decision: Mike will leave the public form unchanged and monitor new requests, responding manually where a valid reminder becomes due. This is not permanent product doctrine or authorisation for bulk/backfilled messaging. Manual fulfilment must verify the relevant occurrence and entry fact, use the purpose the runner requested, include a usable unsubscribe route and record the action/outcome in a private operational log.

By the containment release, the store held 24 reminder requests in total, including Mike's controlled test. Existing rows were backfilled as seen for admin notification purposes; new subscriber, race-submission and club-submission work can produce an aggregate red unseen badge. The badge is an operator-work signal only and says nothing about consent, eligibility or delivery.

At the July 2026 audit, the public view/count included ACTIVE canonical records without requiring a future date. Of 5,320 public-view rows, only 2,891 were upcoming; 1,389 lacked `sort_date`, 954 lacked both principal outbound links, 186 lacked coordinates and 1,734 lacked town and county. Two public test records and several public duplicate pairs were found. Direct anonymous SELECT on the base `events` table also exposed fields intended to remain private.

Plausible's 28-day snapshot on 24 July 2026 reported roughly 1.7k visitors, 700 unique converters under the then-current custom event name `Entry Click` and a nominal 40.4% event rate. Most traffic landed on specific event pages from Google; internal search use was small. ChatGPT sent 19 measured visitors, seven of whom fired that historical event. This supports event-intent resolution and routing as RENM's demonstrated present value, subject to the stated instrumentation limitations. It must not be spliced into the later `Outbound Click` series introduced at application head `9558063`.

These figures are an audit snapshot, not permanent Project Knowledge. They belong in the implementation record and must be re-measured before and after repair.

On 24 July 2026, a supervised Scottish Athletics sync fetched 152 rows, considered 105 eligible, skipped 12 duplicates and labelled 93 existing rows as updated. The live source table remained at 145 rows and a row-level before/after comparison found only one material change: coordinates added to The Great Carradale Canter; 92 upserts were data-identical. The preceding run had considered 110 rows eligible, but the five-row reduction produced no source-missing, demotion or review record. Current sync logs therefore cannot prove continuing source presence or distinguish processed existing rows from materially changed rows.

The supervised England Athletics run later that day completed four independent chunks: 638 fetched/eligible, 198 duplicate skips, 439 writes, 18 inserts and 421 labelled existing updates. The source population rose from 1,473 to 1,491, with no deletion, but only one existing record materially changed: Woodstock 12 & 4 2026 moved from 29 November to 8 November; 420 existing upserts were data-identical. The prior run fetched 641, yet no per-run manifest identifies which earlier source identities were absent. New rows went directly to `ACTIVE`; all 18 lacked organiser identity, two had malformed/non-URL entry destinations, and two used a generic RunThrough homepage. This confirms that imports require staging/gates as well as observability.

## Success measures

Primary:

- Successfully resolved runner intent, broken down by verified entry, waitlist, official-information, reminder and closure outcomes.
- Qualified booking-destination activations and, where controllable, completed paid entries.
- Discovery-qualified canonical future occurrences.
- Percentage of discovery inventory at G3 and G4.
- Confirmed accuracy/error rate from audits and corrections.

Supporting:

- Search-to-event and event-to-entry conversion.
- Entry-state and destination freshness; failed/misdirected destination rate.
- Zero-result rate by geography/filter.
- Duplicate escape rate and invalid-coordinate rate.
- Date, location, organiser and destination completeness.
- Reminder confirmed-consent and delivery rates.
- Organic landing-page quality and return usage.
- Attributable organiser portfolio views, corrections, claims and commercial-funnel outcomes.
- AI-referred visits, resolved intent and sampled citation share; citations without runner or partner value remain secondary.

For the 120–150 day reset, PX1 fixes the numeric baseline and exact definitions before product exposure. The PX5 decision considers traffic trajectory, organic deep-page demand, repeat/results behaviour, source freshness, unresolved conflicts, partner adoption and attributable destination actions together. Approximately three times the current monthly visitor baseline is a useful ambition, not a licence to buy or manufacture low-quality traffic. Thresholds are not moved retrospectively to protect the project from a negative result.

Traffic alone is not proof of trust or completeness.

## Change rule

Before implementation, state which contract is changing, the affected records/routes, migration and rollback, measurement, and acceptance gate. If a request conflicts with this document, stop and raise the conflict rather than silently choosing the newest prompt.
