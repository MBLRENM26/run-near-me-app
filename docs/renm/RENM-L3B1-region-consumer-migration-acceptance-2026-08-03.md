# RENM L3B-1 — Regional discovery consumer migration acceptance

Date: 3 August 2026  
Status: completed, corrected, deployed and independently reconciled  
Scope: migrate only the regional discovery route from `public.events` to `public.events_public_v1`.

## 1. Sourced facts

- Authoritative Lovable head before L3B-1: `a32a2ea393be7175a7da4c9db1e5b18abd416d70`.
- Original implementation/deployment commit: `75ca9907c2abc61f28b4c4dc0c31f99741b8f053`.
- Corrected authoritative Lovable head: `624c65d9991c7e1b20087c9eb9f3e4005b193b52`.
- Lovable's implementation workspace reported preflight head `2135286929e3c1459cd1febe5a6ea0e05cadfebe`, which differed from the authoritative project head. The cause is unresolved.
- The final cumulative diff from `a32a2ea...` to `624c65d...` contains exactly:
  - `src/routes/running-events.$slug.tsx`;
  - `src/integrations/supabase/types.ts`;
  - `src/lib/region-consumer-projection.test.ts`;
  - `docs/renm/RENM-L3B1-region-consumer-migration-acceptance-2026-08-03.md`.
- `package.json` and `bun.lock` do not differ from `a32a2ea...`; `@lovable.dev/vite-tanstack-config` is `2.7.7`.

## 2. Implemented change

The regional route now uses:

```ts
.from("events_public_v1")
.select(DISCOVERY_EVENT_COLUMNS)
.eq("region", region.name)
```

The former `.from("events")` and redundant `.eq("status", "ACTIVE")` were removed from that query only.

The following behaviour remained unchanged: selected discovery columns, region matching, future-or-undated logic, UK bounds or null-coordinate handling, ordering, 1,000-row pagination, distance mapping, `hasDiscoverableLink`, estimated-date sorting, month handling, analytics, metadata and UI.

The generated types add `Views.events_public_v1` with the 25 approved columns and generated relationship references. A targeted source-level regression test asserts that the regional route uses the view, not the base table, omits the status predicate and selects only allowed projection columns.

## 3. Observed database evidence

Independent post-correction query results:

- `events_public_v1` reloptions: `security_barrier=true`, `security_invoker=true`;
- column count: 25, exactly the approved allow-list;
- `anon` and `authenticated`: SELECT true, write privileges false;
- base events: 7,385;
- ACTIVE base events: 5,406;
- view rows: 5,406;
- all-region route-semantic comparison: 14 regions, exact ordered-ID equality true, 2,933 base rows and 2,933 view rows.

The 14 per-region counts reported by Lovable sum to 2,933. An initial report incorrectly claimed a residual difference; that statement was corrected.

## 4. Verification and production observations

Lovable reported after correction:

- full TypeScript check clean;
- Vitest: 35/35 passing;
- production build passing;
- final cumulative diff limited to the four files in §1.

Post-deployment headless-browser observations:

| Region page | HTTP/render result | Visible events | Event links | Console errors |
|---|---:|---:|---:|---:|
| South East | loaded | 178 | 356 | 0 |
| Scotland | loaded | 161 | 322 | 0 |
| London | loaded | 122 | 244 | 0 |

These observations prove successful rendering and no observed missing-view or base-permission error. They do not directly prove unchanged ordering or content because no browser snapshot was captured before migration. Unchanged behaviour is an inference from exact database ordered-ID equivalence and the preserved route logic.

## 5. Reconciliation and deployment caveats

The first implementation was built from a divergent Lovable working-tree head and reintroduced `@lovable.dev/vite-tanstack-config` `2.8.5`, while its report incorrectly treated generated types and dependency drift as pre-existing. Independent comparison against `a32a2ea...` detected this.

A corrective run restored the dependency files to the authoritative baseline, retained the accurate generated view types and corrected the evidence classification. A queued retry then repeated verification and republished the same corrected source state without changing the authoritative head. Lovable therefore performed three publish actions during the sequence: the original implementation publish, the corrective publish and the redundant queued-trigger republish. No deployment identifier was exposed. The final committed source state remains `624c65d...`.

This head-divergence behaviour means future Lovable packages must compare their final cumulative diff against the connector-observed authoritative head, not only the agent workspace's reported preflight head.

## 6. Out-of-scope invariants

- No database migration, view definition, grant, RLS or event data changed.
- No other consumer migrated.
- No eligibility, duplicate, lifecycle or link-trust rule changed.
- Reminder automation remained inactive and fail-closed.
- Project Knowledge, Security Memory, scanner findings and the separate unauthenticated public MCP finding were untouched by implementation.
- No L3C or L4 work began.

At independent close-out, 25 reminder requests existed, one was unseen, zero were marked sent, and cron job 6 remained inactive. This is a separate live operational observation, not an L3B-1 effect.

## 7. Rollback

Application-only rollback:

1. Restore `.from("events")` in `src/routes/running-events.$slug.tsx`.
2. Restore `.eq("status", "ACTIVE")` after the region predicate.
3. Redeploy the previous known-good application commit.

No database rollback is required.

