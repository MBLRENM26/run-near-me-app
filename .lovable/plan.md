## Problem

Admin login fails inside the Lovable preview iframe. The password is correct — the server accepts it and returns `ok: true` — but the session cookie set by `issueAdminSession()` is being dropped by the browser because the preview runs inside a cross-site iframe. The follow-up `adminCheckSession()` call then sees no cookie and bounces back to `/admin/login`, which looks like "password rejected".

Current cookie attributes in `src/lib/admin-session.server.ts`:

```
httpOnly: true
secure:   true
sameSite: "lax"   ← blocked in third-party iframe contexts
path:     "/"
```

Modern Chrome / Safari only send `SameSite=Lax` cookies on top-level navigations from the same site. The Lovable editor loads `id-preview--…lovable.app` inside an iframe whose top frame is `lovable.dev`, so the cookie is treated as third-party and silently discarded.

## Fix

Switch the admin session cookie to `SameSite=None; Secure` so it is allowed in cross-site iframe contexts, while keeping `httpOnly` and the HMAC-signed payload (so security is unchanged). `SameSite=None` requires `Secure`, which we already set.

Apply the same change to the matching `deleteCookie` call so logout still clears it.

### File to change

`src/lib/admin-session.server.ts`
- `issueAdminSession`: `sameSite: "lax"` → `sameSite: "none"`
- `clearAdminSession`: `sameSite: "lax"` → `sameSite: "none"`

No other files need to change. `isAdminAuthenticated`, `verifyAdminPassword`, and the admin server functions stay as-is.

## Verification

1. Open `/admin/login` in the preview iframe, submit the correct password → should land on `/admin/claims`.
2. Refresh `/admin/claims` → should stay logged in (cookie persisted).
3. Click "Log out" → should return to `/admin/login` and a refresh should not auto-restore the session.
4. Sanity-check the published site (`runningeventsnearme.com/admin/login`) still works — `SameSite=None; Secure` is valid there too.

## Why this is safe

- Cookie remains `httpOnly` (JS can't read it) and HMAC-signed with `ADMIN_SESSION_SECRET` (can't be forged).
- `Secure` is enforced, so it only travels over HTTPS.
- No CSRF surface widened: the only state-changing admin endpoints already require this cookie *and* are protected by `requireAdminOrThrow()`; admin mutations are triggered from your own admin UI, not from arbitrary third-party origins. If you later want belt-and-braces CSRF protection for admin POSTs, that's a separate follow-up (custom header check on admin server fns).

## Not doing

- Not touching `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` — both are set and working.
- Not changing the login UI or routing.
- Not republishing required for testing in the preview iframe (server change deploys immediately); the published site picks it up on next publish but already works there today since it's top-level.
