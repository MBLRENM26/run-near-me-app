# Approved coverage improvements — 6 November 2026

Mike approved the audit's correction and ongoing-check packages at 22:10 UTC.

## Applied data

- Four independent 2027 editions added with date/venue/distance evidence and private edit audits: Dartford 21 February, ellenor 14 March, Kent Spring 18 April and Tonbridge 3 October. Past editions untouched.
- Dartford, Woodchurch and Tonbridge use explicit organiser map destination coordinates, not guessed town centres. ellenor stays unpinned because the organiser supplies no numeric venue coordinates.
- Canterbury and Turkey Run aliases marked DUPLICATE with approved survivors through `update_admin_event_checked`; append-only assertions and field locks preserved.
- Bedgebury county/town corrected to Kent/Goudhurst without changing locked location evidence.
- Chatham Christmas Dash points to its dedicated official-information page; no independent entry-open state asserted.
- Blast Meadows receives the organiser's published location metadata coordinates. Other missing pins remain unresolved, not guessed.

All changes read back. There remain seven future stored missing-pin rows: six unresolved originals plus newly added ellenor. The missing Canterbury row is now a duplicate; Blast is pinned. Twenty-nine assertions on the two duplicate clusters remain intact.

## App changes awaiting publication

- Scottish read helper wraps runtime fetch so it retains the global receiver. Regression simulates illegal invocation; live provider read returned 50 rows without a database write. A full published importer run is not claimed.
- Canonical public event details resolve newest accepted same-date duplicate-alias fields without moving or rewriting evidence. Entries status and map URLs remain excluded. Browser verified Turkey Run surface/canicross details survived the redirect.
- Private `/admin/coverage` page presents daily exception lists, changes since the previous report, and weekly calendar leads. Uses existing server-validated admin cookie session; no public/anonymous reports.
- New `coverage_reports` table is service-role-only, RLS enabled, no anon/authenticated grants. RPC collects a daily-idempotent snapshot under a transaction advisory lock.
- Collector checks four fixed official calendars. HTML parsing is bounded, no script execution, no arbitrary URL/redirect following. Robots permissions use a proven parser; unavailability fails closed and becomes a private receipt, never a cancellation.
- Calendar links are research leads, not confirmed Kent events. Kent keyword filtering is only a prioritisation aid and cannot prove geography/completeness. No automatic facts, public edits, new occurrences, outreach or emails.

## Schedule and trial

Job 316, `coverage-check-trial-daily`, is scheduled at 08:00 UTC daily. It calls the stable published route with the existing server-only import secret; a visitor's publishable bearer key cannot authorise it. The published route must exist before the first scheduled request can succeed. Publication remains pending.

Daily checks can lag a newly emerging exception by up to 24 hours; weekly calendar checks by up to seven days. This low frequency limits recurring cost. Trial expires 4 December 2026 at 00:00 UTC. The route refuses further work after expiry. Old homelab collector and reminder job remain disabled.

First signed-in run saved real website receipts and private findings. Nice Work initially redirected to a different calendar path; only that exact same-host redirect is now allowlisted. Its prior failure receipt is retained; next scheduled calendar run must verify the fix. No complete calendar coverage claimed.

## Acceptance evidence

- 41 targeted tests passed: Scottish helper/planner, rich facts and coverage logic.
- Preview build log reports build OK.
- Four new event pages rendered; Canterbury and Turkey Run aliases redirected to intended survivors.
- Greenhithe Explorer now renders eight matches including Dartford and Peninsula; no page errors.
- Mobile Dartford page had no horizontal overflow; desktop/mobile screenshots inspected.
- Admin signed-in coverage page rendered saved findings and calendar receipts without page errors.
- Unsigned coverage-hook requests must return 401; private table has no anonymous read grant.

## Rollback

1. Pause job 316 before app rollback; preserve private receipts. No reminder/old collector reactivation.
2. Revert only this app package and republish. Additive private table can remain; no public data depends on it.
3. Reverse data through audited checked patches using each edit's exact `from` values. Restore alias ACTIVE/duplicate_of=null; retain their assertions/locks. Restore Bedgebury East Sussex/Cranbrook, Chatham's previous homepage URLs and Blast null coordinates only if separately approved.
4. Do not delete the four new occurrences to undo promotion. Demote them reversibly with an audit, preserving their official evidence and independent edition identity.

## Remaining blockers

- Publish app changes, then verify a fresh scheduled receipt and next Scottish scheduled import. Neither was run against production as a synthetic test.
- Six original missing venues plus ellenor require exact usable evidence. Historical Turkey 2024 route marker was not reused as a confirmed 2026 start.
- Calendar trial does not extract or establish all dates/venue changes from known URLs; those still require structured source research. This is a bounded lead detector, not nationwide autonomous ingestion.