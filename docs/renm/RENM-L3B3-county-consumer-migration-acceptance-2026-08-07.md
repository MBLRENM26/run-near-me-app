# RENM L3B-3 — County discovery consumer migration acceptance

Date: 7 August 2026
Status: completed and independently verified
Scope: confirm the existing county discovery migration from `public.events` to `public.events_public_v1` and add a regression guard.

## 1. Sourced facts

- The county migration was introduced by Lovable merge commit `4ec4d950a1275bfc8d976af47081d0317fa72cb2`.
- The verified application baseline for this acceptance run was merged `main` commit `2bef0bf4ca2542ae4c7a810637ecae92c7d9c9fc`.
- The migration changed the county query from `.from("events")` to `.from("events_public_v1")`, removed the redundant `.eq("status", "ACTIVE")` predicate and restored the accepted `@lovable.dev/vite-tanstack-config` `2.7.7` lockfile state.
- Before this package, the county migration had no dedicated regression test or separate acceptance report.

## 2. Accepted implementation

`src/lib/county.functions.ts` uses:

```ts
.from("events_public_v1")
.select(DISCOVERY_EVENT_COLUMNS)
.in("county", cfg.dbNames)
```

It retains the existing future-or-undated filter, UK bounds-or-null handling, ordering, 1,000-row pagination, link-trust filter, event mapping and estimated-date sorting.

The new `src/lib/county-consumer-projection.test.ts` guards four boundaries:

1. the query uses `events_public_v1`;
2. it does not use the `events` base table;
3. it does not re-add the redundant ACTIVE predicate;
4. every selected discovery column remains within the accepted 25-column public projection.

## 3. Verification

Verification ran from a clean source archive in a non-synced Windows Temp directory using the committed `bun.lock` dependency graph:

- targeted county regression: 4/4 passed;
- full Vitest suite: 49/49 passed across 8 files;
- TypeScript: `tsc --noEmit` passed;
- production build: passed, transforming 2,374 client modules and completing the Nitro/Cloudflare bundle.

The installed `@lovable.dev/mcp-js` package has a Windows-only path-separator defect in its containment assertion. The production build required a temporary normalization fix inside the isolated installed package only. No dependency, application source or committed configuration was changed by that local workaround.

## 4. Live production observations

Read-only browser checks on 7 August 2026 observed:

| County page | Visible headline count | Event-detail links | Result | Console errors |
|---|---:|---:|---|---:|
| London | 82 | 164 | rendered event list | 0 |
| Devon | 27 | 54 | rendered event list | 0 |
| West Yorkshire | 15 | 30 | rendered event list | 0 |

These observations prove that representative county routes render current event lists without an observed missing-view or permission error. They do not prove unchanged historical ordering or database-wide row equivalence because no pre-migration browser snapshots or fresh base-table comparison were used in this acceptance run.

## 5. Scope boundaries

- No production application logic changed.
- No database migration, view definition, grant, RLS or event data changed.
- No eligibility, lifecycle, duplicate, link-trust, reminder or analytics rule changed.
- No other consumer was migrated.

## 6. Rollback

Remove `src/lib/county-consumer-projection.test.ts` and this acceptance report. No application or database rollback is required because this package changes only verification coverage and documentation.
