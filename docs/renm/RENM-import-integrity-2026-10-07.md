# Reviewed data after imports

England Athletics and Scottish Athletics imports now capture a database assurance snapshot before fetching and after writing. Both snapshots and the outcome are stored on the existing `sync_runs.review_integrity` field and shown in **Admin → Sync runs → Reviewed data**. This uses the existing import schedule; no extra collector or timer is introduced.

The snapshot compares current values with the existing `event_reviewed_fields`, checks their occurrence dates, verifies audited cancellation/duplicate decisions and canonical targets, and detects missing guards for applied research observations. It covers reviewed records across sources because a canonical race may have a different source from its alias. It does not declare the unreviewed catalogue correct.

- **Passed:** all current checks passed before and after; no additional protected-field conflict attempts were observed.
- **Review required:** corrections survived, but source changes were held, or a pre-existing issue changed during the run. Follow **Review source conflicts** to the existing review interface. A conflict can be a valid new source fact; do not automatically reject it.
- **Failed:** stored reviewed values, lifecycle or canonical targets disagree with their recorded decisions. The import reports an error and retains the written count; completed writes are not silently rolled back or labelled untouched.
- **Unavailable:** an assurance read/validation failed. Imports fail before collection if the baseline cannot be captured. A failure after writing is recorded as an error, not success. A failure to persist the final receipt propagates as an error and leaves an unfinished/stale run visible.

Conflict attempt counts are observed globally during the run window, not precisely attributed to one import; concurrent runs may share the count. Snapshots are point-in-time checks, not continuous monitoring. The report keeps up to 100 violation details and the full violation count. Old run rows show **Not recorded**, not a retroactive pass.

## Reviewed geography and organiser facts

The existing source-research apply/revert workflow now supports literal organiser text, venue, town, county, region, country and numeric latitude/longitude. Schema and SQL validate types, ranges and text lengths. A literal organiser name does not establish a club/organisation relationship: that still uses ORL's existing accepted crosswalk and relationship review.

Only evidenced, reviewed fields are protected. Other source-owned fields continue to update. A conflicting field or edition rollover is retained for review through the existing conflict table; the reviewer can apply a new evidenced correction or reverse an obsolete decision. Do not freeze every imported record or infer an annual edition from last year's date. Coordinates must be reviewed with their venue/precision evidence; range validity alone does not establish a correct map location.

The finite QA01 protection backfill is an operational receipt outside the application repository. It reuses the supervised N02/E01/E02 evidence and checks current values/editions before adding guards. Expected and proposed values are identical, so it adds assurance rather than changing facts. No source is left enabled by this backfill, and the six-source pilot configuration is unchanged.

## Validation and operation

Run `npm test -- --run src/lib/source-research.test.ts src/lib/sync-review-integrity.test.ts src/lib/sync-run-log.server.test.ts src/lib/sync-england-athletics-plan.test.ts src/lib/sync-scottish-athletics-plan.test.ts`, then `npm run typecheck`.

`python3 scripts/test-review-integrity.py` runs transactional SQL tests in a temporary PostgreSQL 16 container with networking disabled. It tests apply/reversal, stale imports, legitimate unreviewed updates, missing guards, actual overwrites, wrong canonical targets, duplicate reactivation and service-only access. Docker and the PostgreSQL image must already be available. Never run these test fixtures against production.

Apply the additive migration before publishing the application. Confirm `get_sync_review_snapshot()` works and inspect its violations before accepting the rollout. A successful test suite and deployment are not a claim that a later scheduled import has run: use the next real EA/Scottish `sync_runs` receipts for that confirmation.
