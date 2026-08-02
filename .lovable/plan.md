# L1 — read-only public-access dependency inventory for `public.events`

Read-only audit. No mutation of any kind occurred (see §10).

## 0. Context mismatch finding (reported, not repaired)

The attached documents supersede `docs/renm/` for this task. Byte comparison (md5):

- identical to repo copy: `RENM-data-lifecycle-contract-2.md` (`74cd0425…`)
- **repo is stale** for three: `RENM-project-knowledge-2.md` (`961ad810…` vs repo `1b86b412…`), `RENM-decision-register-2.md` (`d993dfc7…` vs `cc2f9ea3…`), `RENM-phased-build-brief-2.md` (`5bcf42ca…` vs `07533637…`)
- not present in repo: `RENM-next-thread-handover-2026-08-02.md`, `RENM-validation-monitoring-and-phase-1-packages-2026-08-02.md`

Project Knowledge field state is not observable from this environment (unknown, not confirmed empty). No repair attempted.

## 1. Baseline identifiers (sourced)

- Repository HEAD = `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4` (2026-07-30T19:33:34Z) — matches the stated baseline.
- Deployed commit is not observable from this environment (inference: last reported deploy matches baseline).
- Latest `events`-related migration observable in repo: `supabase/migrations/20260616141621_…sql` (creates `public.public_events`).
- Live table shape: 39 columns, RLS enabled, 7,385 rows.
- Cron jobs: 4 (EA sync), 5 (SA sync), 43 (notify-missed-submissions), 44 (purge-spam) active; **6 (`send-race-reminders-daily`) active = false** — containment intact.

## 2. Dependency matrix

**A. Anonymous (browser, `anon` role, RLS + column grants apply)**

| Consumer | Columns | Filter | Purpose | Projection-safe? |
|---|---|---|---|---|
| `src/routes/index.tsx` upcoming query | `DISCOVERY_EVENT_COLUMNS` (21) | status ACTIVE, date window, UK bounds, non-null town/county/distances | public | yes |
| `src/routes/index.tsx` → `rpc events_within_radius` | function returns 16 fields | ACTIVE + future + radius | public | yes (function is SECURITY INVOKER, would follow the projection) |
| `src/routes/running-events.$slug.tsx` region query | `DISCOVERY_EVENT_COLUMNS` | region, ACTIVE, future/null, UK bounds | public | yes |

**B. Server, publishable key (also `anon` role at DB level)**

| Consumer | Columns | Notes |
|---|---|---|
| `src/lib/stats.functions.ts` | `count(id)` head | ACTIVE + `duplicate_of is null`; needs the projection to pre-apply both filters |
| `src/lib/mcp/tools/get-event.ts` | 20 cols incl. `status` | strips `id`/`status` before output; `status` used only as a filter → projection-safe |
| `src/lib/mcp/tools/search-events.ts` | `DISCOVERY_EVENT_COLUMNS` | projection-safe |

**C. Server functions using `supabaseAdmin` (service role, bypasses RLS) — public-facing output**

`src/lib/events.functions.ts` (event detail, page data, sitemap slugs, region/distance matrix, related/near/same-weekend/organiser blocks), `month-page.functions.ts`, `weekend.functions.ts`, `county.functions.ts`, `city.functions.ts`, `terrain.functions.ts`, `parkrun.functions.ts`, `search.functions.ts` (`search_events_v1`), `subscriptions.functions.ts`, `report-change.functions.ts`.
Column families in use: `DISCOVERY_EVENT_COLUMNS`; detail adds `date_from, date_to, discipline, organiser, lat, lng, created_at, norm_created_at`; `getEventPageData` additionally reads **`status`, `duplicate_of`, `organiser_club_id`** to drive 200/301/404/410. These can migrate to a projection **only** if the gate columns stay available on the service-role path (recommend: keep admin path on the base table).

**D. Admin-only (service role behind `requireAdmin`)**

`admin-events.functions.ts` (~28 queries), `admin.functions.ts`, `admin-date-enrich.functions.ts`, `admin-search.functions.ts`, `organiser-identity.functions.ts`, `backfill-organiser-match.server.ts`, `/admin/*` routes. Stay on the base table.

**E. Ingestion / API / scheduled**

`sync-england-athletics.server.ts`, `sync-scottish-athletics.server.ts` (cron 4/5), `api/public/import-events.ts`, `api/public/admin/fix-event-urls.ts`, `api/public/admin/indexability-stats.ts`, `api/public/admin/backfill-organiser-match.ts`, `api/public/hooks/send-race-reminders.ts` (fail-closed). Write/service-role paths — out of projection scope.

**F. Build-time / cache**

No prerender config in `vite.config.ts`; `sitemap.xml` and event pages are SSR at request time. `src/lib/event-response-headers.ts` sets `X-Status-Override`/`X-Robots-Tag` only. No CDN cache directive on events routes was found. **Search limitation:** dynamic PostgREST filters are string-composed in several places; the matrix above is grep-derived (`from("events")`, `.rpc(`) and may miss any query built entirely from runtime-computed identifiers. No such case was observed.

**G. Database objects depending on `events`**

- View `public.public_events` — `security_invoker=true`, 31 columns, `WHERE status='ACTIVE' AND duplicate_of IS NULL`, SELECT granted to anon/authenticated. **Zero code references** (only FK metadata in generated types). Unused legacy projection.
- Functions `events_within_radius`, `search_events_v1` — SECURITY INVOKER, EXECUTE to anon/authenticated; `search_clubs_v1` unrelated.

## 3. Current public-exposure statement (sourced evidence)

- RLS is **enabled** on `public.events`; exactly one policy: `Events are viewable by everyone`, cmd = SELECT, roles = PUBLIC, `USING (true)`.
- No **table-level** SELECT grant to `anon`/`authenticated` (`has_table_privilege('anon','public.events','select') = false`). Read access comes from **column-level SELECT grants on 38 of 39 columns** to both `anon` and `authenticated`. Only `source`, `source_url`, `organiser_club_id` are ungranted.
- Net effect: an anonymous caller can read **every row** (7,385: 5,406 ACTIVE, 233 HIDDEN, 1,746 other statuses, 1,481 duplicate rows, 3,905 past) and 38 columns, including `status`, `duplicate_of`, `norm_id`, `norm_created_at`, `tsv`, `is_upcoming`, `licensed`, `location_raw`, `series_key`. Application-layer gates (`hasDiscoverableLink`, indexability, status routing) are **not enforced at the database boundary**.
- `anon` and `authenticated` additionally hold table-level INSERT/UPDATE/DELETE/TRUNCATE grants on `events`; writes are blocked only by the absence of write policies. Defence-in-depth gap, no exploit observed.
- No personal data lives in `events`; provenance columns are already withheld from anon.

## 4. Proposed safe projection boundary (explicit column list)

New view `public.events_public_v1`, `security_invoker=false` (or definer function), body:

```
SELECT id, slug, name, date_raw, sort_date, date_from, date_to,
       date_is_estimated, is_recurring, town, county, region, country,
       lat, lng, distances, distance_tags, terrain_tags,
       entry_fee, entry_url, organiser_url,
       is_featured, governance, organiser_type, race_profile
FROM public.events
WHERE status = 'ACTIVE' AND duplicate_of IS NULL
```

Excluded (private / gate / prohibited): `source`, `source_url`, `organiser_club_id`, `organiser`, `licensed`, `status`, `duplicate_of`, `norm_id`, `norm_created_at`, `created_at`, `is_upcoming`, `location_raw`, `series_key`, `is_curated_tags`, `tsv`, `discipline` (unused by anon consumers).

`entry_fee` is retained only because existing cards read it; per project doctrine it must never be asserted as fact — candidate for removal in a later package.

## 5. Consumer-by-consumer migration order

1. `stats.functions.ts` (count only — lowest risk).
2. MCP `search-events`, then `get-event` (drop `status` from the select).
3. `src/routes/index.tsx` upcoming query; then `events_within_radius` re-pointed at the projection.
4. `src/routes/running-events.$slug.tsx` region query.
5. `search_events_v1` (needs `tsv` — keep the function SECURITY DEFINER over the base table rather than exposing `tsv`).
6. Service-role public server functions: no functional need to migrate; optional later for a single definition of "public".
7. Leave admin, ingestion and `getEventPageData` gate logic on the base table.
8. Retire the unused `public_events` view in the same package (verify no external caller first).

## 6. Grant-revocation preconditions

Only after 1–5 are deployed and verified: no anon/publishable-key code path references `public.events`; a production log window shows no anon SELECT on the base table; the projection carries `GRANT SELECT` to `anon`/`authenticated`; then revoke the 38 column-level SELECTs plus the surplus INSERT/UPDATE/DELETE/TRUNCATE grants from `anon`/`authenticated`, and re-scope or drop the `USING (true)` policy. Service-role grants unchanged.

## 7. Proposed acceptance tests

Automated: unit tests asserting the projection column list matches `DISCOVERY_EVENT_COLUMNS` + geo fields; a lint test failing any anon/publishable-key `from("events")`; existing 31 tests plus typecheck and production build.
Anonymous negative-access (production, read-only): anon SELECT on `events` → permission denied; anon read of `source`/`source_url`/`organiser_club_id` → denied; anon SELECT on the projection → rows only where ACTIVE and non-duplicate; anon attempt to read a known HIDDEN or DUPLICATE slug → zero rows; anon INSERT/UPDATE/DELETE → denied; `events_within_radius` and site search still return results.
Production smoke: homepage nearby + upcoming, a region page, an event page (200), a duplicate slug (301), a hidden slug (404), an expired slug (410), `sitemap.xml`, MCP `search_events`/`get_event`.

## 8. Rollback design

Each step is reversible and additive-first: the projection is created before any consumer moves; consumer changes are one commit each and revert cleanly; grant revocation is a separate final migration whose inverse is a single re-GRANT of the 38 columns plus the write grants, and re-creation of the original policy verbatim. Preserve the pre/post canonical events fingerprint (`md5(string_agg(md5(to_jsonb(e)::text), ',' ORDER BY e.id))`) around every migration; no DDL in this package alters row data, so the fingerprint must be unchanged.

## 9. Conflicts, unknowns, decisions for Mike

1. Legacy `public_events` view: retire, or adopt/rename as the projection? (Its column list leaks `status`, `norm_id`, `licensed`, `organiser`.)
2. Should `entry_fee` and `organiser` be excluded from the public projection now, per the "never assert scraped fee/organiser" rule, accepting a card-copy change?
3. `security_invoker` choice: definer view (simplest revocation) vs invoker view (requires retaining column grants) — recommend definer.
4. Surplus anon/authenticated write grants: revoke in this package or as separate hardening?
5. Repo/Project-Knowledge staleness (§0): when to repair, and by which authority.
6. Unknown: deployed commit and any CDN caching in front of events routes are not observable here.
7. Whether service-role public server functions must also migrate (single-definition benefit vs churn).

## 10. Mutation statement

No file, code, schema, data, grant, RLS policy, configuration, secret, scheduled job, admin state, UI, Project Knowledge, repository document or deployment was created, modified or deleted. Actions taken were limited to repository reads, `md5sum` of read-only uploads, and read-only `SELECT`/catalogue queries. No reminder sending, ingestion or research-package import was run. Reminder cron job 6 remains `active = false`. The only file written is this report at `.lovable/plan.md`.
