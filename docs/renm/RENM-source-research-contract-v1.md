# Source research pilot contract v1

The existing change feed accepts known-event reports. This additive pilot supports source discovery and club relationships at `/admin/source-research`. Private tables have RLS and no anon/authenticated grants; server functions require the existing admin session. Public event reads are unchanged.

## Source registration

Register a JSON object with `id` (UUID), `label`, HTTP(S) `url`, `role` (`club`, `organiser`, `entry_provider`, `governing_body`, `community`, `unresolved`), `page_type` (`listing`, `race`, `entry`, `other`), nullable `organisation_id` and `club_id`, non-empty `policy_note`, `enabled`, and `interval_hours` (24–2160). IDs and URLs are immutable; register a new source when its URL changes. Pausing intake rejects new observations. A file-configured worker needs the updated configuration to stop fetching that source.

Store separate pages/accounts rather than collapsing every shared provider to one organiser. A club reference on a source is a research candidate; it does not accept an organising relationship. The bounded pilot has at most 30 configured pages. The administrative catalogue initially lists 200 sources; broader catalogue search/export is future work.

## Evidence intake

`POST /api/public/ingest/research` accepts `{ "version": 1, "observations": [...] }`, 1–50 observations and at most 512,000 UTF-8 bytes. It requires `RESEARCH_FEED_SECRET`, `x-renm-timestamp` (Unix seconds within five minutes) and `x-renm-signature`: lowercase hex HMAC-SHA256 over `timestamp + "." + exact_body`. This credential permits evidence intake only, not acceptance. No database service key is installed on the worker. The admin screen can import the same envelope without configuring a worker credential.

Each observation contains UUID `id`, `source_id`, `run_id`; `evidence` with `source_url`, `final_url`, `captured_at` (offset ISO timestamp), `content_sha256`, `extractor`, and `summary`; a typed `proposal`; and a `conflicts` string array. Source URL must equal the enabled registered source. Duplicate IDs with identical content are no-ops; reuse of an ID with different content fails the entire transaction. New A→B→A observations have new IDs, so a later return to an old value remains visible.

Proposal variants:

- `page_change`: evidence only; no projection.
- `new_occurrence`: `name`, nullable ISO `date`, `location`, nullable `schedule`, nullable `entry_url`. A recurring schedule can remain undated. Discovery always requires separate duplicate/occurrence review and never creates an event on intake or Apply.
- `event_change`: existing `event_id`, `expected_date`, `field` (`entry_url` or `organiser_url`), nullable `expected_value`, HTTP(S) `proposed_value`.
- `club_relationship`: existing `event_id`, `expected_date`, `organisation_id`, `club_id`, nullable `expected_organiser`, nullable `expected_club_id`.

The HTTP/schema layer rejects credentials in URLs, unknown payload fields, invalid dates, repeated IDs and oversized evidence. The database rechecks identity, source state, occurrence, conflicts and expected values inside acceptance transactions.

## Identity and review

The admin identity form accepts `club_id`, nullable `organisation_id`, `source_url` and an evidence `fact`. A null organisation ID creates an approved organisation under the club's current name after checking for existing identities. Supplying an existing ID explicitly approves its identity. Accepted mappings carry evidence, reviewer and date. Ambiguous, merged or competing mappings require separate review. This mapping alone changes no event.

Apply is available only for a URL correction or club relationship with no conflicts. The database locks the observation and event, checks ACTIVE status and both stored occurrence dates, and compares exact expected values. Club projection additionally requires an approved organisation and a unique accepted organisation/club crosswalk. It reuses ORL evidence, `organises` links, existing atomic organiser acceptance and review history. Existing ORL links and joint organisers are refused for separate review; they are not silently adopted. `organiser_type` is not guessed.

Accepted fields receive protection against subsequent imports. Differing incoming values are recorded in `event_review_conflicts`; the reviewed field is retained while unrelated updates continue. If an import changes the occurrence dates, the whole row is retained for conflict review so a verified old-edition destination cannot be attached to a new date. Administrators must reverse/review the correction before deliberately changing a protected field or occurrence. Conflicts are visible in the review screen; repeated identical conflicts increment a counter.

Reverse checks both the current values and the protection owner. A newer correction must be reversed first. Reversal restores earlier values and any earlier protection, appends audit, and reopens an ORL relationship created by this review. It does not remove the underlying identity evidence. Repeated successful Apply/Reverse is idempotent.

## Deliberate pilot limits

Date changes, cancellation/postponement, entry availability, new-event creation, joint organisers and disputed crosswalks remain separate decisions. The legacy change-feed Accept gate stays disabled. `events.status` is not reinterpreted as race cancellation. A waiting-list observation does not promise that entries are open. The initial admin UI accepts structured JSON; richer editing and bulk review need their own usability pass.

Deploy the migration before this application release and register reviewed sources before importing observations. Operational seeds and evidence belong outside this public repository. The worker's delivery secret remains unset unless explicitly configured; file import supports the initial pilot.

## Verification

Application tests cover contract validation, recurrence, conflicts, byte-bounded request reading and HMAC verification. Worker tests cover restart, unchanged pages, A→B→A, failure/backoff, paused sources, private-DNS rejection and delivery retries. `scripts/source-research-test-bootstrap.sql` is for a disposable Postgres database only, followed by the existing ORL migrations, this migration and `scripts/source-research-test.sql`. Those transaction tests exercise real SQL acceptance, stale rejection, import protection, occurrence rollover refusal, nested reversal, ORL projection/reopen and discovery holds. Production fixtures are never used in these tests.

## Existing workflow compatibility (29 September release)

`/admin/source-research` is the single review screen. `/admin/change-reports` redirects there. The private `research_review_queue` view combines existing `source_change_reports` and new evidence observations without copying records. The existing signed watchlist/change-report endpoints and their storage remain compatible. Old pending/unknown/accepted statuses display as pending/held/applied. Legacy reports have no captured page hash or verified occurrence snapshot: the UI identifies that limitation, permits hold/reject only, and requires fresh evidenced research before an applicable correction can be prepared. Historical acceptance is not given a fabricated reversal capability.

ORL remains the authoritative organiser relationship store. Research club acceptance calls the existing ORL function; its evidence, review history and event audit remain in place. The compatibility migration adds strict guard handling around its event update, without changing the identity or relationship acceptance rules.

The normal event editor and date/organiser-URL enrichment use `update_admin_event_checked`: a row lock, protected-field validation, edit and audit occur in one transaction. A protected manual or ORL change fails explicitly and rolls back its whole transaction. Unrelated edits remain possible. Automated import writes preserve protected fields and record conflicts; a changed occurrence holds the complete incoming row. The strict mode is transaction-local and restored after successful manual/ORL updates. Reviewed corrections can be reversed in this screen before a manual occurrence change; reversal checks ownership and current values.

Install both `20260929170000_source_research_pilot.sql` and `20260929171000_research_workflow_compatibility.sql` before releasing the app. The disposable SQL fixture must include the existing July ORL schema, confidence vocabulary and audit-trigger migrations, September ORL acceptance, the original source-change-report table, and both new migrations. The regression tests verify the combined queue, unchanged original ORL projection, explicit manual/ORL conflict rollback, ordinary edits and continued import protection.
