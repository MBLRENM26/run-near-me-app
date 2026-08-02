# RENM L3A-R — security_invoker remediation for `public.events_public_v1`

Date: 2 August 2026, ~15:28 UTC.
Package: L3A-R (single additive remediation). Scope: change one view option. No consumer migration, no eligibility change, no base-grant/RLS change, no application change, no deployment.

---

## 1. Superseding instruction (sourced fact)

Mike's latest explicit instruction supersedes the L3A acceptance report's "accepted linter flag" rationale (`RENM-L3A-safe-public-projection-acceptance-2026-08-02.md` §4 and §11 item 1):

> "The security-definer finding must not be ignored or accepted by design."

Accordingly the definer semantics were removed rather than defended, and Security Memory now requires `security_invoker = true` for public/exposed views unless Mike explicitly approves a separately evidenced exception.

Authority note: §4/§11.1 of the L3A acceptance report are superseded by this document. The L3A report itself was left unmodified as instructed.

## 2. Migration identifier

- `supabase/migrations/20260802152800_2fb6038d-7977-42a3-bd97-955eb02fb163.sql`

```sql
ALTER VIEW public.events_public_v1 SET (security_invoker = true);
```

Applied additively with `ALTER VIEW`. The view was **not** dropped, recreated or replaced.

## 3. Pre/post `reloptions` (observed evidence)

| | `reloptions` |
|---|---|
| Pre | `{security_invoker=false,security_barrier=true}` |
| Post | `{security_barrier=true,security_invoker=true}` |

`security_barrier=true` preserved. Owner unchanged (`postgres`). View definition unchanged (`md5(pg_get_viewdef(...)) = 6d4bf3d753542b92dda2be128c664618`). View comment unchanged (`md5 = 595e149dffc6cfddf67e36448536c349`).

## 4. Linter result (observed evidence)

Live Supabase linter re-run immediately after the migration and again standalone:

- `0010_security_definer_view`: **not reported** (previously ERROR for this view).
- Remaining output: 10 × INFO `0008_rls_enabled_no_policy`, all pre-existing and unrelated to this package.

## 5. Exact columns and row predicate (unchanged)

25 columns, in order:

`1:id 2:slug 3:name 4:date_raw 5:sort_date 6:date_from 7:date_to 8:date_is_estimated 9:is_recurring 10:town 11:county 12:region 13:country 14:lat 15:lng 16:distances 17:distance_tags 18:terrain_tags 19:entry_fee 20:entry_url 21:organiser_url 22:is_featured 23:governance 24:organiser_type 25:race_profile`

Row predicate: `WHERE status = 'ACTIVE'::text` — the only predicate. No date, canonical/`duplicate_of`, link-trust, quarantine, terminal-state, indexability or destination-validity rule was added.

## 6. Row equivalence (observed evidence, post-migration)

| Check | Result |
|---|---|
| `count(*)` from `public.events_public_v1` | **5,406** |
| `count(*)` from `public.events WHERE status='ACTIVE'` | **5,406** |

Equal, matching the L3A accepted figure.

## 7. Two-way projection comparison

Explicit 25-column projection both sides:

- `view EXCEPT base` → **0**
- `base EXCEPT view` → **0**

## 8. View grants (observed evidence, post-migration)

`relacl` = `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,sandbox_exec=ar/postgres,anon=r/postgres,authenticated=r/postgres}` — byte-identical to the L3A accepted state.

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | true | false | false | false |
| `authenticated` | true | false | false | false |
| `PUBLIC` | false | false | false | false |

`service_role` retains the platform default ALL (unchanged by choice, as in L3A). `sandbox_exec` is the audit session role, not an application role.

## 9. Base table grants and RLS unchanged

| Check | Result |
|---|---|
| `public.events` RLS enabled | true |
| Policy | `Events are viewable by everyone` \| cmd `r` \| `USING (true)` |
| `anon` selectable columns / table SELECT | 38 / false |
| `authenticated` selectable columns / table SELECT | 38 / false |

Identical to the L3A preflight and post-state. No `GRANT`, `REVOKE`, `ALTER TABLE` or `CREATE/ALTER POLICY` statement was issued on the base table.

**Functional consequence (inference, verified structurally):** with `security_invoker=true`, reads through the view are evaluated as the calling role. Because `anon`/`authenticated` currently hold column-level SELECT on all 25 exposed columns and the base RLS policy is `USING (true)`, anonymous reads through the view still return the same 5,406 rows. No behavioural change is expected for any consumer — and no consumer uses the view yet.

## 10. Event data unchanged (observed evidence)

| | Row count | `md5(string_agg(md5(to_jsonb(e)::text), ',' ORDER BY e.id))` |
|---|---|---|
| Pre-L3A-R | 7,385 | `ffeb8a5bd27e3efe7193002b878dbeeb` |
| Post-L3A-R | 7,385 | `ffeb8a5bd27e3efe7193002b878dbeeb` |

No INSERT/UPDATE/DELETE was issued.

## 11. Reminder job 6 unchanged (observed evidence)

`cron.job`: jobid 6 `send-race-reminders-daily` → `active = false`. Jobs 4, 5, 43, 44 unchanged (`active = true`). No reminder code, flag or schedule was touched; HTTP sending remains fail-closed.

## 12. Rollback

```sql
ALTER VIEW public.events_public_v1 SET (security_invoker = false);
```

Single reversible option flip; no data or grant state is involved.

## 13. Final repository diff

Net diff from governed baseline `b2c06351735ba56f2d508504f30dfae4eb90d274` contains exactly:

- `supabase/migrations/20260802152800_2fb6038d-7977-42a3-bd97-955eb02fb163.sql`
- `docs/renm/RENM-L3A-R-security-invoker-remediation-2026-08-02.md`

Incidental platform drift in `package.json` (`@lovable.dev/vite-tanstack-config` 2.8.5 → restored 2.7.7), `bun.lock` and `src/integrations/supabase/types.ts` was restored byte-for-byte to the baseline. No package install or type regeneration was performed. The existing L3A report, both L3A migrations, application source, Project Knowledge, MCP configuration and deployment are untouched. Nothing was published or deployed.

## 14. Unresolved implications for L3C

1. **Invoker semantics remove the mechanism L3A relied on.** With `security_invoker=true`, revoking base-table SELECT from `anon`/`authenticated` (the L3C goal) would also break reads through `public.events_public_v1`. L3C can therefore no longer be "revoke base grants, keep the view working" using this view alone.
2. **L3C must choose a different boundary shape**, each needing separate approval and evidence:
   - a `SECURITY DEFINER` **function** boundary (auditable, callable-only, no definer-view linter class), or
   - retaining base column-level SELECT for the 25 approved columns and revoking only the remaining columns, or
   - a separately approved, separately evidenced definer-view exception under the new Security Memory rule.
3. **Column-withholding for `source`, `source_url`, `organiser_club_id`** is currently enforced by base column grants, not by the view; if those grants are ever widened, the view remains safe but other anonymous paths would not be.
4. **`public.public_events`** (legacy, wider column list, `security_invoker=true`) still exists; retirement still requires proven dependency absence.
5. **No consumer uses `events_public_v1`.** Discovery counts, sitemap, routing and eligibility are unchanged. L3B, L3C and L4 remain unstarted.
6. **Security-finding registry state:** the scanner entry `SUPA_security_definer_view` was previously placed in the ignored state and cannot be un-ignored by the agent; only Mike can restore it from the Security tab. The underlying condition is fixed and no longer reported by the live linter.
