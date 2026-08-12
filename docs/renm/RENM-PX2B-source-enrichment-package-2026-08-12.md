# RENM — PX2B source-enrichment package

Status: approved for implementation on 12 August 2026; production sync acceptance remains pending.

## Purpose

Make the first Race Explorer product test representative enough to assess without introducing a broader schema, PostGIS, `pg_trgm`, a map or a weaker destination-trust policy.

## Verified baseline

The England Athletics and Scottish Athletics sync runs completed successfully on 12 August 2026. Read-only production SQL and live Explorer acceptance then established:

| Source             | Future active | Missing coordinates | Missing distance tags | Missing terrain/profile | Missing governance |
| ------------------ | ------------: | ------------------: | --------------------: | ----------------------: | -----------------: |
| England Athletics  |           634 |                   0 |                   197 |                     175 |                175 |
| Scottish Athletics |            84 |                  67 |                    50 |                      27 |                  0 |

The earlier claim that roughly 96% of Scottish events were invisible used the stricter organiser-owned-link calculation. The application’s actual `hasDiscoverableLink` gate also admits event-specific platform links when trusted governance is present. All 84 future Scottish Athletics rows were visible in the live governance-filtered Explorer. PX2B therefore makes no link-gate change.

The Scottish public feed contains a postcode for every currently fetched running-category record. For the 67 future database rows missing coordinates, 63 full postcodes resolve and the AB10 outward code supplies one bounded centroid; three rows remain unresolved rather than guessed. One supplied Kilmarnock coordinate is 56.6 miles from its source postcode and is a clear correction candidate.

Two future TRA rows named `Test` and `TEST3` are confirmed source test records. Their approved correction is `ACTIVE → HIDDEN`; they are not deleted.

## Approved production correction completed

On 12 August 2026, the following exact rows were changed from `ACTIVE` to `HIDDEN`:

- `14836184-cc8d-4f8f-8671-c66b1c608bd8` — `Test` / `test-tra`;
- `92ec1a51-b176-4ded-8a05-70599c28c7c1` — `TEST3` / `test3-tra`.

A read-back confirmed both rows remain in `events` with status `HIDDEN`, while `events_public_v1` returns zero matching rows. The correction is reversible and no record was deleted.

## Approved implementation

1. Parse distance and terrain tags inside the EA and SA sync planners so enrichment survives later syncs.
2. Set source-evidenced governance and derive a race profile only from supported discipline/tag evidence.
3. Preserve human-curated tags and already reviewed governance/race-profile values.
4. Preserve existing coordinates when a source or postcode result is unavailable.
5. Batch-geocode Scottish source postcodes during sync. A postcode-service failure must not fail the governing-body sync.
6. Prefer supplied source coordinates unless postcode evidence shows a discrepancy greater than five miles; use postcode coordinates for a clear outlier.
7. Hide only the two exact approved TRA test IDs, with status history retained.
8. Re-run both source syncs after deployment and reconcile the before/after counts.

## Expected bounded impact

- EA: fill 175 governance/profile/terrain gaps and recover distance tags where the current deterministic parser has evidence (180 of the 197 missing future-tag rows at audit time).
- SA: recover 64 of 67 missing future coordinates, correct the Kilmarnock outlier, fill 27 terrain/profile gaps and recover distance tags where supported (16 of 50 missing future-tag rows at audit time).
- Leave genuinely unsupported values empty/unknown.

Counts are acceptance expectations, not permission to coerce the data until a target is reached. Feed changes between audit and rerun must be reported separately.

## Explicit exclusions

- no database schema migration;
- no PostGIS, `pg_trgm` or map;
- no weakening or source-specific bypass of the discovery link gate;
- no duplicate merge, deletion or series remodelling;
- no inferred coordinates for unresolved/invalid full postcodes;
- no overwrite of curated tags or reviewed taxonomy; and
- no course-rich event-page work in this package.

## Acceptance

Before merge: planner/helper regression tests, full tests, TypeScript, lint and production build must pass. After deployment: run EA and SA synchronisation, confirm clean run logs, reconcile future-active enrichment counts, inspect Scottish radius results and verify the two test rows remain hidden.
