# RENM L3B-2 — Homepage curated consumer migration acceptance

Date: 3 August 2026
Package: L3B-2 (single consumer migration, reversible)
Scope: homepage curated “upcoming” (`quality-v1`) query only.

## Content-equivalence gate

- Authoritative connector head: `52db822543263d7458df9fe853c561cbbea22de7`
  (content-identical to approved application baseline
  `9212332020bd18b814b3ad79f887c5c01124d79f`, including `package.json` 2.7.7).
- Agent working HEAD at gate: `7170d701dd7505f46648a6deee06f7449ef9e9d9`
  (platform wrapper/WIP commit; SHA equality not required by instruction).
- Cumulative content diff at gate: exactly one line —
  `@lovable.dev/vite-tanstack-config` `2.7.7` -> `2.8.5` in `package.json`.
  This is the permitted recurring platform drift; restored to `2.7.7`.
- Post-restore `git diff 52db822…` → empty. Gate passed under rule 3.

## Read-only preflight (projection)

- `public.events_public_v1` column count: 25.
- Required `DISCOVERY_EVENT_COLUMNS` (20 columns) missing from view: 0.
- View options: `security_barrier=true`, `security_invoker=true`.
- Privileges: `anon` SELECT true, INSERT/UPDATE/DELETE false;
  `authenticated` SELECT true, INSERT/UPDATE/DELETE false.

## Ordered equivalence (base table vs projection)

Same curated predicates (date window `current_date + 30` .. `+ 120`,
`date_is_estimated = false`, non-null lat/lng, UK bounds-or-null, non-null
town/county, non-empty distances, name not ilike `%parkrun%`), ordered
`is_featured desc, sort_date asc, id asc`:

| metric | base `events` (status=ACTIVE) | `events_public_v1` |
| --- | --- | --- |
| candidate rows | 720 | 720 |
| first-20 ordered id list | identical | identical |

`first20_identical = true`.

## Production before/after (link-trusted displayed nine)

Captured from `https://runningeventsnearme.com/` with a headless browser,
“Discover events across the UK” section, in render order.

Before (base table):

1. /events/hatfield-midweek-5k-series-2026-09-02
2. /events/chase-the-sun-tatton-10k-series-2026-2026-09-02
3. /events/caerketton-downhill-race-edinburgh-2026
4. /events/armada-5k-series-2026-09-02
5. /events/sexarathon-harper-scarper-5k
6. /events/ealing-eagles-5k-2026-09-02
7. /events/shetland-toe-to-tip
8. /events/something-wild-trail-festival-ultra-dartmoor-2026
9. /events/friday-night-under-the-lights-fast-barrowford-5k-september

After (projection): identical list, identical order, no console errors.
See “Deployment evidence” below.

## Change made

`src/routes/index.tsx` — curated `quality-v1` query only:

- `.from("events")` → `.from("events_public_v1")`
- removed `.eq("status", "ACTIVE")` (the projection is ACTIVE-only)
- projection column types are nullable, so the card mapping asserts
  `id`/`slug`/`name` as `string` and uses `is_featured ?? false`
  (`events.is_featured` is `NOT NULL` in the base table, so no value change).

Unchanged: `events_within_radius` RPC, live counts, ordering, `.limit(20)`,
`hasDiscoverableLink` trust gate, `trusted.slice(0, 9)`, query key, all copy.

`src/lib/home-curated-projection.test.ts` — new targeted regression test.

## Verification

- `tsgo --noEmit`: clean.
- Vitest: 44/44 passed (7 files), including the new 6 assertions.
- Production build: succeeded.
- Cumulative diff vs `52db822…` before deploy: `src/routes/index.tsx`,
  `src/lib/home-curated-projection.test.ts` (plus this report). `package.json`
  at `2.7.7`; no lockfile drift.

## Rollback

- Restore only this curated query to `.from("events")`.
- Restore `.eq("status", "ACTIVE")`.
- Redeploy the previous known-good application commit.
- No database rollback; no database object was changed by this package.
