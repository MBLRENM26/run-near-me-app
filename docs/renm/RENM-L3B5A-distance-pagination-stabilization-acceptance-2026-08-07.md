# RENM L3B-5A — Distance pagination stabilization acceptance

Date: 7 August 2026
Status: implementation verified; merge, publish and live acceptance pending
Scope: stabilize pagination in `getEventsByDistance` before any separately approved migration to `events_public_v1`.

## 1. Starting state and approved boundary

- The verified application baseline was docs-only `main` head `bc8267a738177547bd43a2437c5d9126776665b7`; production code remained at `f05895a94ebb24371cd161ca74ce537466e4d34e`.
- `getEventsByDistance` fetched eligible rows in 1,000-row pages ordered only by nullable `sort_date`.
- Mike approved L3B-5A after the read-only L3B-5 preflight found that a source-only view migration could not preserve results under that partial order.
- This package does not migrate the query, remove its ACTIVE predicate, change eligibility or alter database data/schema.

## 2. Read-only defect evidence

The base table and `events_public_v1` contained exactly the same 2,904 selected eligible rows when ordered deterministically. Under the production query's `sort_date`-only pagination:

- the base query returned 2,904 positions containing 2,897 unique IDs and seven duplicate positions;
- the view query returned 2,904 positions containing 2,895 unique IDs and nine duplicate positions;
- six unique IDs appeared only in the base result and four only in the view result;
- repeated runs were stable within each source, proving source-specific tie ordering rather than changing data;
- pagination boundaries intersected ties at `2026-10-18` and at null `sort_date`.

The defect caused genuine rows to be omitted and other rows to be counted more than once. It also made a direct L3B-5 view swap fail ordered-result and count acceptance.

## 3. Accepted implementation

The national distance query retains its base-table source and ACTIVE predicate and adds one secondary order before `.range(from, to)`:

```ts
.order("sort_date", { ascending: true, nullsFirst: false })
.order("id", { ascending: true })
.range(from, to)
```

The new `src/lib/distance-pagination-order.test.ts` guards the exact `getEventsByDistance` section, confirms the temporary base-table/ACTIVE state and requires both orders before pagination.

## 4. Deterministic comparison results

With `sort_date, id` ordering, both sources returned 2,904 positions containing 2,904 unique IDs, with exact raw sequence, complete result, displayed result and regional-count equality for every configured distance key.

| Distance key | Existing reported total | Deterministic total |
|---|---:|---:|
| 5K | 1,159 | 1,159 |
| 10K | 392 | 390 |
| Half marathon | 207 | 209 |
| Marathon | 37 | 37 |
| Trail | 421 | 422 |
| Ultra | 54 | 54 |

The 10K decrease removes duplicate positions while recovering one previously omitted unique event. Half marathon and trail recover omitted unique events. No record is deleted or made ineligible.

The 5K total remains 1,159, but 175 events enter and 175 leave the displayed 500 because the existing cap cuts through a large equal-date/undated group whose prior ordering was implicit. All remain eligible and accessible; this material presentation effect requires live acceptance.

## 5. Local verification

- targeted pagination regression: 4/4 passed;
- full Vitest suite: 57/57 passed across 10 files;
- TypeScript: `tsc --noEmit` passed;
- production build: passed in the existing non-synced Windows Temp verifier, transforming 2,374 client modules and completing the Nitro/Cloudflare bundle;
- no OneDrive dependency installation or package-tree modification was performed.

## 6. Scope boundaries

- No database, view, grant, RLS or event record changed.
- No eligibility, distance matching, legacy fallback, trust, regional count, estimated-date sort or 500-card cap changed.
- No package or lockfile changed.
- Region×distance, its matrix and every other consumer remain untouched.
- L3B-5B view migration remains unapproved and must use this deterministic baseline.

## 7. Remaining acceptance

1. Review and merge only the source, regression and governance files.
2. Republish the GitHub merge through Lovable.
3. Confirm corrected totals and successful rendering on representative distance pages, with particular attention to the 5K capped list.
4. Record the merged head and live observations before marking L3B-5A complete.

## 8. Rollback

Remove the secondary `.order("id", { ascending: true })` line and the L3B-5A regression test. No database rollback is required.
