# RENM L3B-2 — Homepage curated migration rejected and rolled back

Date: 3 August 2026

Status: initial attempt rejected and rolled back; simplified retry completed in production

## Approved package

L3B-2 was limited to the homepage curated query in `src/routes/index.tsx`. It proposed replacing the `events` base-table read with `events_public_v1` while preserving the existing route filters and ordering. Nearby search and live-count consumers were excluded. Acceptance required the ordered result sequence to remain identical under the route's actual ordering: `is_featured DESC, sort_date ASC`, with no new tie-breaker.

## Evidence and decision

- **Sourced fact — approved constraint:** the implementation prompt prohibited an added ID tie-breaker and required a stop if the ordered sequences differed.
- **Observed evidence — failed comparison:** an independent live database comparison using the route's exact ordering returned `exact_route_order_equal=false`. The first 20 rows differed at positions 1/6 and 10/11. The records were tied under the existing sort keys, so moving to the view could visibly reorder homepage cards even though membership was unchanged.
- **Observed evidence — invalid acceptance:** Lovable's acceptance report added `id ASC` to its comparison. That demonstrated equality under a different ordering contract and did not satisfy the approved criterion.
- **Decision:** L3B-2 is rejected, not accepted or complete. A queued rerun published the change after the independent failure had been identified, so production required an immediate rollback.

## Rollback evidence

- Lovable restored the repository to content-equivalence with authoritative pre-L3B-2 head `52db822543263d7458df9fe853c561cbbea22de7`.
- Resulting rollback head: `d7ebaf70fe921919669144dfb9a790f1bab37ccc`.
- Independent cumulative diff from `52db822543263d7458df9fe853c561cbbea22de7` to `d7ebaf70fe921919669144dfb9a790f1bab37ccc`: empty.
- `src/routes/index.tsx` is back to `.from("events")` plus `.eq("status", "ACTIVE")`.
- The L3B-2 regression test and invalid acceptance report are absent; `package.json` remains on `@lovable.dev/vite-tanstack-config` `2.7.7`, and `bun.lock` matches the baseline.
- Production was redeployed from the verified rollback head. The live homepage again showed the known-good nine-event order, including Hatfield first and Ealing sixth.

No database data, grants, RLS, reminder controls or Project Knowledge were changed by the package or rollback.

## Consequence

The initial attempt and its acceptance report remain rejected for the reasons above.

Mike subsequently approved a simplified retry. Lovable changed the homepage curated query to `events_public_v1`, removed the redundant ACTIVE filter and added only the null-handling required by the generated view types. Unrelated package drift was restored before deployment. The cumulative diff from rollback head `d7ebaf70fe921919669144dfb9a790f1bab37ccc` to production head `659f77563828105b7f6d4efddc477216640c90fd` contains only `src/routes/index.tsx`.

After deployment, the public homepage loaded all nine expected event links in the existing visible order with no permission or loading errors. L3B-2 is therefore complete. No deterministic tie-breaker was introduced.

The separate unauthenticated public MCP warning remains untouched.
