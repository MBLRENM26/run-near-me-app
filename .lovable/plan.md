# Security & Hygiene Hardening

Addresses the seven concerns raised, grouped by risk. Assumptions (flag if wrong):
- Admin is only used from the same origin (`runningeventsnearme.com` / preview). No cross-site embedding needed → safe to tighten cookie to `SameSite=Lax`.
- The six identical `*_email_infra.sql` migrations have all already been applied in prod (fingerprint `35328eec…` is stable). Safe to collapse the duplicates into no-ops rather than delete history.
- You want minimal-risk, incremental fixes — not a full test-suite build-out this pass.

---

## P0 — Admin login & session hardening

**1. Durable brute-force limit on `adminLogin`** (`src/lib/admin.functions.ts`)
- Reuse the existing `public.consume_submission_rate` pattern via a new small helper (or a second key namespace) keyed by `sha256(cf-connecting-ip + daily_salt)`.
- Caps: **5 failed attempts / 15 min** and **20 / day** per IP. Successful login resets nothing (attempts count regardless) to avoid oracle. Return generic "Too many attempts, try later" with `Retry-After`.
- Keep the existing 400 ms delay as belt-and-braces.

**2. Cookie + CSRF** (`src/lib/admin-session.server.ts`)
- Change `sameSite: "none"` → `"lax"` on both `issueAdminSession` and `clearAdminSession`.
- Add an origin/referer check helper used by all state-changing admin server fns (`updateSubmission`, `bulkUpdateSubmissions`, `createEventFromSubmission`, admin-events/clubs/notify mutations). Reject when `Origin` header is present and not in an allow-list derived from `VITE_APP_URL` + preview host. Read-only fns (`adminCheckSession`, `listSubmissions`) unaffected.

## P0 — API error hygiene

**3. Sanitise public import endpoints** (`src/routes/api/public/import-events.ts`, `import-clubs.ts`, and any admin sync route returning `err.message`)
- Log full error server-side (existing `console.warn`/`error`), respond `{ error: "Import failed" }` with a stable `request_id` (random uuid) that also appears in the log line. Same treatment for sync-* routes.

## P1 — Migration dedupe

**4. Collapse the six identical `20260520*_email_infra.sql`**
- Keep the earliest (`20260520160643_email_infra.sql`) as the real migration.
- Replace the other five file bodies with a single-line comment (`-- superseded: content merged into 20260520160643_email_infra.sql`). This preserves the migration history row (so `supabase_migrations.schema_migrations` doesn't diverge from prod) while removing byte-duplicate SQL that would otherwise re-run on a fresh env. The original file was written idempotently (`create extension if not exists`, etc.) so replaying it on empty DBs still works.
- Do **not** delete the files or rewrite history.

## P1 — Test + typecheck scripts

**5. Expose vitest and typecheck in `package.json`**
- Add scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"typecheck": "tsc --noEmit"` *(corrected per your note)*
- No CI file changes in this pass — just make the commands available so CI configs can call them.

**6. Seed critical-path tests** (small, targeted — not a full suite)
- `src/lib/admin-session.server.test.ts` — sign/verify round-trip, tampered sig rejection, expiry.
- `src/lib/submission-rate-limit.server.test.ts` — bucket math, day-cap Retry-After (mock DB via existing pattern).
- `src/lib/link-trust.test.ts` — classifyEventLink truth table for aggregator/entry-platform/organiser hosts (highest-leverage: it gates every discovery surface).
- Defer MCP/import/query tests to a follow-up backlog item.

## P2 — Secret scoping (design only in this plan)

**7. Split `IMPORT_SECRET`**
- Not a code change in this pass — a written proposal added to `.lovable/plan.md` backlog: introduce `SYNC_SECRET` (EA/SA/NI/WA sync routes), `IMPORT_SECRET` (bulk import-clubs/events), `MAINT_SECRET` (backfill, fix-event-urls, indexability-stats), rotate independently. Deferred because it requires coordinated cron + vault updates and the concern is blast-radius, not an active compromise.

---

## Technical notes

- `SameSite=Lax` still sends the admin cookie on top-level GET navigations to `/admin/*`, so no re-login required after deploy.
- Origin check must skip when `Origin` header is absent (same-origin form posts on some browsers) but require match when present — mirrors standard CSRF-lite pattern.
- The login rate-limit helper should not import `admin-session.server`; keep it a pure function of the request headers to avoid circular server-only wiring.
- Rate-limit key for login uses a distinct prefix (`login:`) so it can't collide with submission buckets.

## Out of scope

- Full CSRF token flow (double-submit) — origin check is sufficient for a same-origin admin panel.
- Rewriting sync jobs to use scoped secrets (P2 design only).
- Broad test coverage across MCP/imports/filters.

## Verification

- Manually: 6 failed logins in a row → 7th returns 429 with Retry-After.
- Manually: admin panel still works after cookie change (login → list submissions → update one).
- `bun run test` and `bun run typecheck` succeed locally.
- Fingerprint check after migration edits: `SELECT md5(string_agg(md5(to_jsonb(e)::text), ',' ORDER BY e.id)) FROM public.events e;` still `35328eec4f5c0a1086ef84fdd6e03f69`.
