# Diagnose the "Unauthorized" toast on date-enrichment preview

## What we know

- You're already on `/admin/events/enrich-dates`, so the admin cookie loaded fine for the GET that rendered the page.
- The CSV parsed client-side (you saw 209 rows in the preview window before clicking the button), so the toast came from the server function's `requireAdminOrThrow()` call (the only place that throws the literal string "Unauthorized").
- Server logs for the last hour show **zero POSTs** to the project — only the GET that loaded the page. That means the POST either never reached the server (preview-iframe proxy ate it) or it was rejected before logging.
- Other admin write fns (editing a race) worked for you earlier in the same session, which points away from the admin cookie itself being broken and toward something specific to this request (most likely the preview iframe + POST body combo).

There's a known platform issue where the Lovable preview's fetch proxy interferes with certain POST requests inside the iframe. The cleanest way to rule that in or out is to run the exact same import once against the published URL.

## Step 1 — Confirm it's the preview iframe (no code changes)

Ask you to:

1. Open the published admin: `https://run-near-me-app.lovable.app/admin/events/enrich-dates`
2. Sign in with the admin password.
3. Upload the same `ALL-confirmed-migration.csv` and click **Preview changes**.

Two outcomes:

- **Works on published** → confirmed preview-iframe issue. We do the actual 209-row import there. No code change needed for this run. I'll then add a small in-page banner on `/admin/events/enrich-dates` noting "run this on the published URL if preview hangs" so future-you doesn't get tripped up.
- **Still says Unauthorized on published** → it's a real bug. Move to Step 2.

## Step 2 — Only if published also fails

Add temporary server-side logging in `previewDateEnrichments`' handler (before `requireAdminOrThrow`) to print whether the `admin_session` cookie was present and whether HMAC verify passed. Re-run, read `server-function-logs`, then fix the actual cause (likely cookie attributes or HMAC mismatch). Remove the logging after.

## Out of scope for this turn

- No DB writes, no schema changes, no importer logic changes.
- Not switching the importer to the `x-admin-secret` header path — that's a fallback only if the cookie auth turns out to be genuinely broken.

## Technical notes

- `requireAdminOrThrow()` in `src/lib/admin-date-enrich.functions.ts` is the only source of the `"Unauthorized"` message; it reads `getCookie("admin_session")` and verifies the HMAC in `src/lib/admin-session.server.ts`.
- The session cookie is set with `sameSite: "none"; secure: true`, which is why it works inside the preview iframe at all — but some browsers/profiles block third-party cookies on POST specifically.
- If we end up needing a code fallback, the cleanest one is a new `/api/public/admin/enrich-dates` server route guarded by `IMPORT_SECRET` (the same pattern the EA/SA sync routes use), with the operator pasting the secret once into a localStorage-backed field on the importer page.
