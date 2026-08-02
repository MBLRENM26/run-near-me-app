# RENM L3A — additive safe public event projection shadow (acceptance evidence)

Date: 2 August 2026, ~15:00 UTC.
Package: L3A. Scope: create one unused public-column boundary over `public.events`. No consumer migration, no eligibility change, no base-grant revocation, no deployment.

Production application baseline remains `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4` (**sourced fact**, per installed kernel; no application code changed in L3A).

---

## 1. Read-only preflight (observed evidence, 2026-08-02 ~14:59 UTC)

| Check | Result |
|---|---|
| Repository head before L3A | `2365bc522ee2ee957691464ec21fa7ab1846b3c5` |
| PostgreSQL version | `PostgreSQL 17.6 on aarch64-unknown-linux-gnu` → supports `security_invoker` and `security_barrier` |
| `public.events` column total | **41** (matches the verified 41-column schema; L1's historic "39" wording is superseded) |
| `anon` selectable columns | 38 of 41; table-level SELECT = `false` |
| `authenticated` selectable columns | 38 of 41; table-level SELECT = `false` |
| `service_role` | 41 columns, table SELECT = `true` |
| Withheld from anon/authenticated | `source`, `source_url`, `organiser_club_id` |
| RLS on `public.events` | enabled; one policy `Events are viewable by everyone`, cmd `r` (SELECT), roles `PUBLIC`, `USING (true)` |
| Existing views in `public` | `public_events` (`security_invoker=true`), `public_clubs` (`security_invoker=true`) |
| `public.events_public_v1` exists? | **No** → safe to `CREATE VIEW` |
| Row counts | 7,385 total; 5,406 `status='ACTIVE'`; 38 ACTIVE with `duplicate_of IS NOT NULL` |
| Pre-migration canonical fingerprint | `ffeb8a5bd27e3efe7193002b878dbeeb` |
| Test convention | Vitest unit tests only (`src/lib/*.test.ts`, 4 files / 31 tests). **No database-test convention exists** |

Preflight passed on every gate; no conflict required a stop.

**Fingerprint note (observed evidence, not a defect of L3A):** the fingerprint recorded here differs from the historic ORL baseline `35328eec4f5c0a1086ef84fdd6e03f69` / 7,318 rows because ordinary ingestion has since added rows (now 7,385). The L3A invariant is pre == post *within this package*, which holds (§7).

**Automated-test gap (sourced fact):** the repository has no database/SQL test harness and L3A forbids introducing one. Therefore no database test file was added; reproducible acceptance SQL is inlined in §6 below.

---

## 2. Repository commit and migration identifiers

- Migration 1 (create + comment + grants): `supabase/migrations/20260802145949_0c7bc713-5f3b-4252-a4e2-6695d823ed75.sql`
- Migration 2 (grant correction, see §5): `supabase/migrations/20260802150057_f17e2b79-e276-4b05-83be-117f53db2992.sql`
- Repository commit: recorded in the delivery message accompanying this report (the two migrations plus this report are the only tracked additions).

## 3. Exact view definition and ordered columns (observed evidence)

`pg_get_viewdef('public.events_public_v1', true)`:

```sql
 SELECT id,
    slug,
    name,
    date_raw,
    sort_date,
    date_from,
    date_to,
    date_is_estimated,
    is_recurring,
    town,
    county,
    region,
    country,
    lat,
    lng,
    distances,
    distance_tags,
    terrain_tags,
    entry_fee,
    entry_url,
    organiser_url,
    is_featured,
    governance,
    organiser_type,
    race_profile
   FROM events e
  WHERE status = 'ACTIVE'::text;
```

Ordered columns (25, exactly the approved list):
`1:id 2:slug 3:name 4:date_raw 5:sort_date 6:date_from 7:date_to 8:date_is_estimated 9:is_recurring 10:town 11:county 12:region 13:country 14:lat 15:lng 16:distances 17:distance_tags 18:terrain_tags 19:entry_fee 20:entry_url 21:organiser_url 22:is_featured 23:governance 24:organiser_type 25:race_profile`

No `SELECT *`. The only row predicate is `status = 'ACTIVE'`. No date, `duplicate_of`, link-trust, quarantine, terminal-state, indexability, location-completeness or destination-validity predicate was added.

Excluded and unavailable through the view: `source`, `source_url`, `organiser_club_id`, `organiser`, `licensed`, `status`, `duplicate_of`, `norm_id`, `norm_created_at`, `created_at`, `is_upcoming`, `location_raw`, `series_key`, `is_curated_tags`, `tsv`, `discipline`.

## 4. Owner and security options

```
events_public_v1 owner=postgres opts={security_invoker=false,security_barrier=true}
```

Definer-style boundary (`security_invoker=false`) with `security_barrier=true`, as specified.

**Accepted linter flag (observed evidence + inference):** the Supabase linter reports `0010_security_definer_view` ERROR for this view. This is the *intended* L3A design, because a future L3C grant-revocation step requires the boundary to read the base table as its owner rather than as the caller. It was not "fixed", since doing so would contradict the approved package. Compensating controls: the view exposes only approved public columns, restricts rows to `status='ACTIVE'`, and is read-only to `anon`/`authenticated` (§5).

## 5. Grants (observed evidence, post-correction)

`relacl`:

```
{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,sandbox_exec=ar/postgres,anon=r/postgres,authenticated=r/postgres}
```

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | true | false | false | false |
| `authenticated` | true | false | false | false |
| `service_role` | true | true | true | true (pre-existing platform default; unchanged by choice) |
| `PUBLIC` | `has_table_privilege('public', …, 'SELECT') = false` | — | — | — |

**Deviation recorded (observed evidence):** the first migration's `REVOKE ALL … FROM PUBLIC` did not remove role-specific privileges that the platform's `ALTER DEFAULT PRIVILEGES` had granted; immediately after creation `anon` and `authenticated` held `arwdDxtm` (ALL). Because a definer-style auto-updatable view with write privileges would have been writable as `postgres`, one additional narrow migration revoked ALL from those two roles and re-granted SELECT only. Final state matches the L3A requirement of "SELECT only to anon and authenticated". No other object, row or grant was touched. `sandbox_exec` is the audit session role, not an application role.

## 6. Read-only acceptance checks (all passed)

```sql
-- a) exactly 25 approved columns, in order
SELECT ordinal_position, column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='events_public_v1'
ORDER BY ordinal_position;               -- => 25 rows, list in §3

-- b) excluded fields cannot be selected
SELECT source FROM public.events_public_v1 LIMIT 1;  -- ERROR: column "source" does not exist
SELECT status FROM public.events_public_v1 LIMIT 1;  -- ERROR: column "status" does not exist
SELECT tsv    FROM public.events_public_v1 LIMIT 1;  -- ERROR: column "tsv" does not exist

-- c) row count equals ACTIVE base count
SELECT (SELECT count(*) FROM public.events_public_v1) AS v,
       (SELECT count(*) FROM public.events WHERE status='ACTIVE') AS b;   -- 5406 | 5406

-- d) two-way EXCEPT against the same explicit base projection
--    (explicit 25-column lists both sides)                              -- 0 | 0

-- e) no non-ACTIVE row leaks in
SELECT count(*) FROM public.events_public_v1 v
WHERE v.id IN (SELECT id FROM public.events WHERE status <> 'ACTIVE');   -- 0

-- f) ACTIVE mapped duplicates deliberately retained (proves no L4 filtering)
SELECT count(*) FROM public.events_public_v1 v
JOIN public.events e ON e.id = v.id
WHERE e.duplicate_of IS NOT NULL;                                        -- 38

-- g) base anonymous access unchanged
SELECT r.rolname,
       (SELECT count(*) FROM information_schema.columns c
        WHERE c.table_schema='public' AND c.table_name='events'
          AND has_column_privilege(r.rolname,'public.events',c.column_name,'SELECT')) AS cols,
       has_table_privilege(r.rolname,'public.events','SELECT') AS tablesel
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated');
-- anon 38 / false ; authenticated 38 / false  (identical to preflight)
```

Additional confirmations:

- `public.events` RLS policy after L3A: `Events are viewable by everyone | r | true` — unchanged.
- `public.public_events` untouched: `md5(pg_get_viewdef(...)) = 5f1c00d2fdc03763bc8ad692e4a01ab3`, `reloptions = {security_invoker=true}`. Left in place deliberately; external dependency absence is not proven.
- `events_within_radius`, `search_events_v1`, `public_clubs`, ingestion/reminder functions and jobs: not referenced by either migration.

## 7. Pre/post row count and non-destructive fingerprint (observed evidence)

| | Row count | `md5(string_agg(md5(to_jsonb(e)::text), ',' ORDER BY e.id))` |
|---|---|---|
| Pre-L3A | 7,385 | `ffeb8a5bd27e3efe7193002b878dbeeb` |
| Post-L3A | 7,385 | `ffeb8a5bd27e3efe7193002b878dbeeb` |

Identical: no event row or field changed. No INSERT/UPDATE/DELETE was issued in this package.

## 8. Application verification (observed evidence)

- `tsgo --noEmit` (full TypeScript check): clean, no output.
- `vitest run`: 4 files, **31 tests passed**.
- `bun run build` (production build): `✓ built in 14.83s`, exit 0.

No application code was changed, and nothing was changed to make these pass. Nothing was published or deployed.

## 9. Rollback

```sql
DROP VIEW IF EXISTS public.events_public_v1;
```

Fully reversible: the view is unused, additive, and holds no row data. Reverting also removes the §5 grant state with the object.

## 10. Final repository diff

Tracked additions only:

- `supabase/migrations/20260802145949_0c7bc713-5f3b-4252-a4e2-6695d823ed75.sql`
- `supabase/migrations/20260802150057_f17e2b79-e276-4b05-83be-117f53db2992.sql`
- `docs/renm/RENM-L3A-safe-public-projection-acceptance-2026-08-02.md`

No database test file (no compatible convention — see §1). Incidental platform modification of `src/routeTree.gen.ts` was restored; `package.json`, lockfiles and `.lovable/plan.md` are unchanged. `git status` clean after the build.

## 11. Unresolved issues / limitations

1. **Definer-view linter ERROR** stands by design (§4). If Mike prefers `security_invoker=true`, the boundary cannot later support base-grant revocation; this is an L3C decision.
2. **`service_role` retains ALL on the view** (platform default). Harmless (it already bypasses RLS) but could be narrowed to SELECT in a later hardening step.
3. **`entry_fee` is exposed** because current cards read it, despite the "never assert scraped fee as fact" doctrine. Flagged for removal decision in L3B/L4, unchanged here.
4. **`public.public_events` remains** as an unused legacy projection with a wider column list; retirement needs proven dependency absence.
5. **Deployed-commit confirmation and any edge/CDN behaviour** are not observable from this environment (unknown, not verified).
6. **Fingerprint drift versus the historic ORL baseline** is explained by ordinary ingestion (§1) but has not been line-item reconciled; L3A only asserts pre == post.
7. **No consumer uses the view.** Discovery counts, sitemap, routing and eligibility are byte-for-byte unchanged; L3B/L3C/L4 remain unstarted.
