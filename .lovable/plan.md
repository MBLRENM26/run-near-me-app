## Runtime smoke test — admin auth + rate-limit hardening

Close-out verification for the dual-gate rate limiter and CSRF/session changes on the **published** environment (`https://run-near-me-app.lovable.app`). Read-only where possible; the only writes are one login + one logout.

### 1. Preflight (local, no state change)
- `bun run build` — production build must exit 0.
- `bun run lint` — ESLint clean (or only pre-existing warnings; diff against baseline).
- `bun run test` — vitest suite green.
- Typecheck already green; re-run `bunx tsgo --noEmit` for parity.

Abort the runtime phase if any of the above fail; capture output under `/tmp/browser/smoke/`.

### 2. Runtime smoke via Playwright (published URL)
Single script under `/tmp/browser/admin-smoke/`, headless Chromium, viewport 1280×1800, screenshots at each step. Uses `ADMIN_PASSWORD` from env — never logged, never screenshotted into a visible field (password input masked).

Steps and assertions:

1. **Login UI flow**
   - GET `/admin/login`, submit the password form.
   - Assert redirect to `/admin/claims` and 200 response.

2. **Cookie attributes**
   - Read `admin_session` via `context.cookies()`.
   - Assert: `httpOnly=true`, `secure=true`, `sameSite="Lax"`, `path="/"`, `expires` ≈ now + 14 days (±1 day tolerance).
   - Assert value matches `^\d+\.[0-9a-f]{64}$` (payload.sig shape) — do not log the value.

3. **Authenticated session check + protected read**
   - Call `adminCheckSession` server fn via the page (`useServerFn` route already exists) → expect `{ authenticated: true }`.
   - Trigger a protected read-only submissions call (navigate to `/admin/claims` list, or invoke `adminNotify`/submissions list fn) → expect 200 with data shape, no 401/403.

4. **CSRF: hostile origin replay**
   - Using the authenticated cookie, `fetch` the same server-fn endpoint from a new page context with `Origin: https://evil.example`.
   - Expect rejection (403 from `createCsrfMiddleware`). Record status + body.

5. **CSRF: missing origin metadata replay**
   - Repeat the fetch with `Origin` and `Referer` stripped.
   - Expect rejection (403). Record status + body.

6. **Logout**
   - Invoke `adminLogout` server fn.
   - Assert `admin_session` is gone from `context.cookies()` (or has past expiry).

7. **Post-logout session check + protected call**
   - `adminCheckSession` → `{ authenticated: false }`.
   - Protected mutation (e.g. admin submissions action) → expect `Unauthorized` / 401-equivalent handled response (no crash).

### 3. Missing-IP warning payload check
- Grep worker logs from the smoke run via `stack_modern--server-function-logs` (search: `admin_login_trusted_ip_missing`).
- If present, assert the log line is exactly `[admin-login-rate] admin_login_trusted_ip_missing {}` — no IP, headers, cookie, password, or payload fields. If absent (Cloudflare edge did populate `cf-connecting-ip` in prod), record that and note the per-IP gate was exercised instead.
- Also confirm no other log entry in the run contains the password, `Authorization`, `Cookie`, or the raw session value.

### 4. Deliverable
A single report back in chat with:
- Build/lint/test exit codes.
- Cookie attribute table.
- Status codes + brief body for each of the 4 auth/CSRF checks (pre- and post-logout).
- Screenshot filenames under `/tmp/browser/admin-smoke/screenshots/`.
- Log-line evidence for the missing-IP warning (or note that per-IP gate ran).

No source edits unless a check fails; failures return with a diagnosis and a follow-up plan, not an in-place fix.
