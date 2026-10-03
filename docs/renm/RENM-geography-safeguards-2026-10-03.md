# Geography safeguards — 3 October 2026

Mike approved this bounded continuation after nine existing race records received 48 audited geography corrections. Those data corrections are separate from this code package.

## Import behaviour

The existing authenticated generic event import rejects the **whole batch with HTTP 422 before any upsert** when geography checks fail. The response includes zero written, input row index, norm_id and reason codes. The producer must correct and resubmit the complete batch. This is explicit rejection, not a new persistent review queue or a silently partial import.

Checks cover the exact/rounded legacy fallback point, zero coordinates, missing halves of a coordinate pair, UK-labelled points far outside the UK, International county labels combined with UK geography, overseas countries with UK regions, and conflicting explicit UK nation/region text. A nearby real point is not rejected merely for proximity to the fallback.

The import plausibility envelope is intentionally wider than the existing directory envelope, to avoid rejecting legitimate coastal/island venues. Neither envelope is an exact national border: an Irish venue inside the rectangle is not declared British. The guard cannot detect every plausible-but-wrong coordinate; evidence review remains necessary.

Valid overseas records remain stored, with no derived UK region. Blank coordinates and undated recurring events remain supported. No next date is invented for parkrun. Existing norm_id upserts, provenance, source-review triggers and ORL remain intact. EA and Scottish Athletics use their existing importers; this package does not rerun or modify their schedules.

## Discovery behaviour

The shared PostgREST fragment permits missing country, blank country, UK nations and UK aliases (case insensitive). Explicit other countries fail even with null coordinates or a mistaken UK point. The existing coordinate envelope and null-latitude behaviour are retained.

The shared fragment covers the existing homepage, regional, county, month, weekend, terrain, distance, MCP and related-event consumers. City discovery/counts, Explorer, same-town and same-weekend recommendations also use it. The existing radius and keyword database functions apply the same rule before ranking/limits.

The public view, selected public columns, detail-page access, occurrence indexability, lifecycle and headline stored-event count are unchanged. Organiser portfolios and historical identity/duplicate lookup are not UK proximity discovery and retain their existing contracts. The two database functions retain signatures, security-invoker mode and grants. No tables or columns are added, no events are changed by the migration.

## Validation and release

- 402 application tests across 43 files, TypeScript, scoped lint and production build passed.
- Real disposable PostgreSQL fixtures for UK/overseas/missing-country/missing-coordinate/recurring/past/hidden records, result caps and invoker mode.
- Existing real source-research/ORL SQL regression fixture: acceptance, stale rejection, overwrite protection, date rollover hold, reversal and ORL conflict handling.
- Read-only live PostgREST preflight: the geography-only ACTIVE pool changes from 5,737 to 5,735, excluding Chicago and Cape Town with null coordinates. This pool includes past dates and is not a headline count of upcoming races.
- Verify production SQL definitions/grants, app commit, representative pages and unauthenticated import rejection. Synthetic HTTP 422 and zero-write behaviour are tested through the real handler with a mocked database; do not send authorised production fixture imports.

Disposable SQL test order: scripts/geography-test-bootstrap.sql, supabase/migrations/20261003170000_uk_discovery_geography.sql, scripts/geography-test.sql. Never use production for fixtures.

## Rollback

Revert the application commit and republish. Restore the two pre-release function definitions captured in the private planning file research-batch-29-geography-rpc-rollback.sql; retain existing privileges. If the migration was registered, reconcile its migration-history entry with the rollback. Both rollback and reapplication were exercised in the disposable database. The nine prior data corrections are independent and must not be reverted with this package.

## Remaining work

31 known fallback rows are past or not ACTIVE and remain a separate cleanup. The current guard cannot prove national boundaries or source accuracy, and accepted valid later source changes can still update geography. This does not restart RunABC scraping, expand the six-source pilot, automate review acceptance or guarantee importer persistence.
