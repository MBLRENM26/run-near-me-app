# Rich race research staging — 19 October 2026

Approved separate package: private typed staging, not public acceptance.

## Completed

- Private batch, assertion and append-only review tables installed with RLS and service-role-only access. Public/authenticated table reads explicitly denied.
- CSV parsing uses Papa Parse. File hashes identify input files, never pretend to identify captured webpages. Repeating the exact import uses the existing batch and conflict-safe inserts.
- 212 assertions across 39 race slugs imported through the signed-in admin UI, twice more without duplication. All slugs resolve to existing rows; every assertion still requires edition/source review. No supplied assertion required mismatch quarantine in this batch.
- Unknowns remain null; explicit no is false. Qualified numeric statements remain wording rather than invented numbers. Licence uncertainty, entry-state freshness and course-map permission caveats remain visible.
- Admin research page now has a distinct structured race-facts section, search, per-race expandable findings, short quotes, source links and hold/reject/reopen audit controls. No approval/publication control was added.
- 23 focused validation/month/intake tests passed. Signed-in readback confirmed populated findings; expanded Buntingford evidence inspected visually. Latest build log: build OK.
- Managed database privilege checks show anon and authenticated reads denied, admin reads allowed. Assertion immutability probe rejected an attempted no-op update. Review audit immutability trigger installed and inspected; no destructive probe against real reviews performed.
- Canonical events fingerprint remains `83092929778e0163c22e60e4d379584d`, identical to pre-package baseline. No events, ORL relationships, monitor schedules or subscriber changes.

## Boundaries and residuals

The newly referenced `RENM-baseline-2026-10-19.md` and `RENM-research-payload-handoff.md` were not present in this workspace or uploads. Installed recovery checkpoint boundaries were honoured; monitor intake/pilot configuration was untouched. Sync those documents before further monitor work.

The current screen shows the latest staged batch with a bounded 1,000-assertion read. This supplied batch fits. Larger/multiple-batch administration requires a separate pagination package; do not assume unlimited intake.

Public acceptance/projection, freshness expiry and publication remain separate gates. Candidate club matching is not approved identity. Rollback withdraws the batch and removes the UI integration while retaining private evidence/audit; no automatic deletion or event reversal is needed.
## Second pass — 20 Oct 2026

- Staged privately as a new batch: 3,704 assertions across 670 races (3,740 evidence rows; 36 same-fact second quotes collapsed with a caveat). First 39-race batch untouched.
- 79 flagged: 54 differ from the earlier batch, 25 contradictory within the file. Per-distance parts of joined facts are accepted, not treated as contradictions.
- Event rows unchanged (fingerprint 06efcaaf… before and after). Nothing published.
- Retry candidates: 81 in-window races (18 page did not load, 29 edition not confirmed, 34 facts not stated); 31 in-window blocked/not-allowed races excluded from retry.
- Limitation: one inherited batch lacks robots/request-pacing logs; some agent notes reference a QC date after the check date.

## Targeted retry — 20 Oct 2026

- 81 retry candidates → 16 races / 44 facts staged as a third private batch; 0 flagged. Outcomes: 35 still unavailable, 5 stale edition, 25 nothing stated.
- Request log archived at docs/renm/audit/race-facts-retry-request-log-2026-10-20.csv (160 requests, no sub-second intervals). The first unlogged attempt is recorded as a batch limitation.
- Event fingerprint unchanged (06efcaaf…). Next pass: small rolling pass ~4 weeks before each race date rather than another full retry.
