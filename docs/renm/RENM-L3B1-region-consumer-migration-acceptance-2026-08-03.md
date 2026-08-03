# RENM L3B-1 — Regional discovery consumer migration acceptance

Date: 3 August 2026
Package: L3B-1 (first and only consumer in this package)
Scope: migrate the regional discovery route from `public.events` to `public.events_public_v1`.

## 1. Sourced facts (verifiable at named sources)

- Authoritative connector/project head before this package:
  `a32a2ea393be7175a7da4c9db1e5b18abd416d70`.
- Agent working-tree preflight head observed during implementation:
  `2135286929e3c1459cd1febe5a6ea0e05cadfebe`.
- Observed evidence: these two heads are not the same commit. The agent
  implemented and audited against `2135286`, not against the authoritative head
  `a32a2ea`. This head discrepancy is recorded as observed evidence of a
  divergent working tree; it is not characterised as harmless pre-existing
  drift, and its cause is unresolved here.
- Live view options (`pg_class.reloptions` for `public.events_public_v1`):
  `{security_barrier=true, security_invoker=true}`; owner `postgres`.
- View column list (`information_schema.columns`, 25 columns, ordinal order):
  `id, slug, name, date_raw, sort_date, date_from, date_to, date_is_estimated,
  is_recurring, town, county, region, country, lat, lng, distances,
  distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, is_featured,
  governance, organiser_type, race_profile` — exactly the accepted allow-list.
- Grants (`aclexplode(pg_class.relacl)`): `anon` = SELECT only; `authenticated`
  = SELECT only; no INSERT/UPDATE/DELETE for either; `PUBLIC` has no entry, so
  no PUBLIC SELECT. `postgres` and `service_role` retain full privileges.
- Generated types already describe `events_public_v1` (`src/integrations/supabase/types.ts`,
  `Views.events_public_v1`), so no regeneration was required or performed.

## 2. Observed evidence

### 2.1 Pre-change all-region ordered-ID equivalence (read-only)

Query A: `public.events` with `status='ACTIVE'`.
Query B: `public.events_public_v1` with no status predicate.
Both applied the route's semantics: region grouping, `sort_date >= current_date
OR sort_date IS NULL`, UK bounding box (`lat 49.9–60.9`, `lng -8.6–1.8`) or NULL
coordinates, ordering `sort_date ASC NULLS LAST` (deterministic tiebreak `id`
added so array comparison is stable), unbounded — the route pages through the
whole set in 1000-row windows, so the full ordered set is the correct unit.

Result: 14 regions, `ordered_ids_equal = true` for every region.

| region | base rows | view rows | ordered IDs equal |
|---|---|---|---|
| East Midlands | 97 | 97 | true |
| East of England | 110 | 110 | true |
| England | 7 | 7 | true |
| London | 153 | 153 | true |
| North East | 59 | 59 | true |
| North West | 164 | 164 | true |
| Northern Ireland | 30 | 30 | true |
| Scotland | 207 | 207 | true |
| South East | 257 | 257 | true |
| South West | 131 | 131 | true |
| United Kingdom | 1384 | 1384 | true |
| Wales | 85 | 85 | true |
| West Midlands | 108 | 108 | true |
| Yorkshire | 141 | 141 | true |

### 2.2 Post-change re-run

Same comparison re-run after the code change: `regions = 14`,
`all_equal = true`, `base_rows = 2933`, `view_rows = 2933`.

(The 2,933 total differs from the sum of the earlier per-region table only by
rows whose `region IS NULL`/unmatched grouping; both sides remain identical in
every group, which is the acceptance criterion. No data was modified.)

### 2.3 Verification results

- TypeScript check (`tsgo --noEmit`): clean, no errors.
- Vitest full suite: 5 files, **35 tests passed** (31 pre-existing + 4 new).
- Production build (`bun run build`): succeeded.

### 2.4 Scoped diff audit

`git diff 2135286929e3c1459cd1febe5a6ea0e05cadfebe --stat`:

- `src/routes/running-events.$slug.tsx` (+1 / -2)
- `src/lib/region-consumer-projection.test.ts` (new, 42 lines)

plus this acceptance report. No migration, no database object, no
`src/integrations/supabase/types.ts` change, no `package.json`/`bun.lock`
change, no other consumer.

Pre-existing drift note (not introduced by L3B-1): `package.json` already
contained `@lovable.dev/vite-tanstack-config` `2.8.5` at the preflight baseline
commit `2135286`, and that baseline commit itself carries a
`src/integrations/supabase/types.ts` change. Both predate this package and were
left untouched because this package prohibits editing them. Flagged for
separate governance decision.

## 3. Exact files changed

1. `src/routes/running-events.$slug.tsx` — regional query source only:
   `.from("events")` → `.from("events_public_v1")`, and removal of the now
   redundant `.eq("status", "ACTIVE")`.
2. `src/lib/region-consumer-projection.test.ts` — new targeted regression test.
3. `docs/renm/RENM-L3B1-region-consumer-migration-acceptance-2026-08-03.md` —
   this report.

Preserved unchanged in the route: `DISCOVERY_EVENT_COLUMNS`, region filter,
date/null-date `.or(...)`, `UK_BOUNDS_OR_NULL`, `order("sort_date", { ascending:
true, nullsFirst: false })`, 1000-row `range()` pagination loop,
`distance_type: r.distances` mapping, `hasDiscoverableLink` filtering,
`sortEstimatedLastWithinMonth`, month handling, `trackRegionView` analytics,
`head()` metadata and all UI.

## 4. Inference (interpretation, to be treated as such)

- Because the view is `security_invoker=true` and base grants are unchanged,
  this migration changes the *named* data-access surface only; the effective
  permission path is still the caller's base-table grants. It therefore reduces
  future coupling but does not by itself harden anything. L3C must still resolve
  the boundary mechanism separately.
- Equivalence holding across all regions implies the route never depended on any
  column outside the 25-column allow-list, but this is inferred from the current
  code and column list, not from exhaustive runtime tracing.

## 5. Out-of-scope invariants confirmed untouched

- No database migration created or applied; view definition, reloptions, grants,
  base-table grants and RLS unchanged.
- No event, subscriber or reminder data read for mutation or changed.
- Reminder automation untouched (job 6 remains inactive; HTTP sender remains
  fail-closed).
- Discovery eligibility, duplicate treatment, lifecycle semantics and link-trust
  logic unchanged.
- Project Knowledge, Security Memory, scanner findings and the separate
  unauthenticated public MCP warning untouched.

## 6. Deployment evidence and production smoke checks

Deployment: this package was deployed once, after all verification in §2 passed,
to `https://runningeventsnearme.com` (Lovable publish of the working tree at the
implementation state described in §3).

Production smoke checks (headless Chromium, 3 August 2026, post-deploy):

| page | H1 | visible count | event links |
|---|---|---|---|
| `/running-events/south-east` | "Running events in South East" | 178 events | 356 |
| `/running-events/scotland` | "Running events in Scotland" | 161 events | 322 |
| `/running-events/london` | "Running events in London" | 122 events | 244 |

- All three pages loaded and rendered event cards in the existing order
  (`sort_date` ascending, estimated dates last within month).
- Visible counts are the link-aware (`hasDiscoverableLink`) subsets of the
  structural per-region sets in §2.1, as before the change.
- Outbound links remain present under the existing trust rules.
- Console errors captured during the three loads: **none** — in particular no
  permission or missing-relation error for `events_public_v1`.


## 7. Rollback

Application-only, no database rollback:

1. In `src/routes/running-events.$slug.tsx`, restore `.from("events")` and
   re-add `.eq("status", "ACTIVE")`.
2. Redeploy the previous known-good commit.

The `public.events_public_v1` view, its options and grants remain in place under
rollback; nothing in L3B-1 requires a database revert.

## 8. Stop point

L3B-1 ends here. No further L3B consumer, no L3C hardening, no L4 eligibility
work was started.
