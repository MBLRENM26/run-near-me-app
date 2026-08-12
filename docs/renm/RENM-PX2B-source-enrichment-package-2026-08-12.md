# RENM — PX2B source-enrichment package

Status: accepted complete in production on 12 August 2026.

## Purpose

Make the first Race Explorer product test representative enough to assess without introducing a broader schema, PostGIS, `pg_trgm`, a map or a weaker destination-trust policy.

## Verified baseline

| Source             | Future active | Missing coordinates | Missing distance tags | Missing terrain/profile | Missing governance |
| ------------------ | ------------: | ------------------: | --------------------: | ----------------------: | -----------------: |
| England Athletics  |           634 |                   0 |                   197 |                     175 |                175 |
| Scottish Athletics |            84 |                  67 |                    50 |                      27 |                  0 |

All 84 future Scottish Athletics rows passed the actual governance-aware discovery gate. PX2B made no link-gate change.

## Implementation accepted

- EA and SA sync planners now derive repeatable distance tags, terrain tags, governance and race profile from supported source evidence.
- Human-curated tags, reviewed taxonomy and existing coordinates are preserved.
- Scottish postcodes are batch-geocoded on a best-effort basis; postcode-service failure cannot fail the governing-body sync.
- Supplied source coordinates remain preferred unless postcode evidence shows a discrepancy greater than five miles.
- The JustGo adapter accepts either an array response or a JSON-encoded string response.
- Two exact TRA test records were changed from `ACTIVE` to `HIDDEN`; both remain stored and the public view returns neither record.

## Production acceptance

The published app and merged `main` were verified at `a1838de3f8e8dc31223eff4dc8afcb83cd6bd720`.

| Source             | Run result | Future active | Missing coordinates | Missing distance tags | Missing terrain/profile | Missing governance |
| ------------------ | ---------- | ------------: | ------------------: | --------------------: | ----------------------: | -----------------: |
| England Athletics  | 4 successful chunks; 638 fetched; 435 written; 6 new; 429 updated; 0 failed pages | 641 | 0 | 78 | 37 | 37 |
| Scottish Athletics | success; 131 fetched; 86 running-category; 75 written; 1 new; 74 updated; 11 protected duplicates skipped | 85 | 9 | 40 | 1 | 0 |

The Kilmarnock cross-country occurrence was corrected from the 56.6-mile source-coordinate outlier to the source-postcode location. The two TRA test rows remained `HIDDEN` after both syncs.

## Residual boundary

- The remaining 37 EA taxonomy/terrain gaps are legacy series/collision rows not rewritten by the conservative source batch. Rewritten EA rows received the new enrichment.
- Six of the nine remaining Scottish coordinate gaps are three protected legacy duplicate pairs.
- The other Scottish gaps are Gigha with no usable postcode and two Jedburgh occurrences carrying the invalid postcode `TD6 8QH`.
- Unsupported distance values remain empty rather than coerced to meet a target.

These residuals are duplicate/source-data backlog, not evidence that either acceptance sync failed.

## Verification

- 14 test files / 88 tests passed before merge;
- TypeScript, scoped lint, production build and `git diff --check` passed;
- production sync logs contained no errors or failed EA pages;
- post-sync SQL reconciled enrichment counts and exact test-row status; and
- local and origin `main` were clean and synchronized after merge.

No PostGIS, `pg_trgm`, broader schema, weakened link rule or record deletion was introduced.
