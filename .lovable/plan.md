## Goal

Find out why the admin session cookie verifies in the iframe preview but rejects on `run-near-me-app.lovable.app` / `runningeventsnearme.com`, without changing behaviour yet.

## Step 1 — Add temporary logging

In the server function backing `previewDateEnrichments` (and the shared admin-session verifier it calls), log on every call:

- whether the `admin_session` cookie arrived at all
- the cookie's `host` / `domain` as the server sees it (request `Host` header + `Origin`)
- whether HMAC verification passed, and if not, the failure reason (bad signature, expired, malformed)
- whether `ADMIN_SESSION_SECRET` is present at runtime (boolean only — never the value)

No PII, no secret values, no cookie payload — just shape and pass/fail flags.

## Step 2 — Reproduce on the published URL

User signs into admin on `run-near-me-app.lovable.app`, opens the date-enrich page, clicks Preview, hits the Unauthorized toast.

## Step 3 — Read logs

Pull `server-function-logs` (published deployment) filtered by the function name. The diagnostic lines will show which of these is true:

- cookie missing → `sameSite`/domain mismatch on the Set-Cookie
- cookie present, HMAC fails → `ADMIN_SESSION_SECRET` differs between iframe and published worker envs, or signing differs
- cookie present, HMAC ok, but rejected later → expiry or role check

## Step 4 — Decide

Based on the log result, either:
- park the fix (if root cause is clear and low-impact for terminal-style usage), or
- write a targeted fix in a follow-up plan (one line change in most of the likely causes).

## Step 5 — Remove the diagnostic logs

Always — they're temporary instrumentation, not permanent telemetry.

## Out of scope this plan

- Changing cookie attributes, secret values, or verification logic
- Touching the iframe flow (it works)
- Any UI changes
