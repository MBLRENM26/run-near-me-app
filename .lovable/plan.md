## Diagnosis

Network + replay show the login server function succeeds (the client navigates to `/admin/claims`), but a moment later `adminCheckSession` returns `authenticated: false` and the page bounces back to `/admin/login`. So the password is correct — the **session cookie is not coming back on the next request**.

Almost certain root cause: the preview runs inside the Lovable editor as a **cross-site iframe**. The admin session cookie is currently set with:

```ts
sameSite: "lax", secure: true
```

`SameSite=Lax` cookies are blocked in cross-site iframe contexts by Chrome/Safari, so subsequent `fetch` calls from the iframe (including `adminCheckSession`) go out without the cookie. That perfectly matches the symptom — login response sets the cookie, browser drops it, next call sees no session. The "incorrect password" message on the second attempt is just the same cookie loss after a successful sign-in.

(On the published custom domain `runningeventsnearme.com` it would actually work today because it's not in an iframe — but it's broken everywhere we use the editor preview, which is where you tested.)

## Fix

### 1. `src/lib/admin-session.server.ts`
Change the cookie to be iframe-safe:

- `sameSite: "none"` (required for cross-site iframe)
- `secure: true` (already set; required by `SameSite=None`)
- Keep `httpOnly`, `path: "/"`, `maxAge` as-is
- Apply to both `issueAdminSession` and `clearAdminSession`

No other behavior changes — HMAC signing, expiry, and verification stay identical.

### 2. `src/routes/admin.login.tsx` — password visibility toggle
- Add a local `showPassword` boolean state
- Wrap the `<Input>` in a relative container with an inline `<button type="button">` on the right
- Toggle button switches input `type` between `"password"` and `"text"`
- Use a lucide `Eye` / `EyeOff` icon, accessible label (`aria-label="Show password"` / `"Hide password"`)
- No change to submit logic

### 3. Verification
After the change, sign in again from the preview:
- Login succeeds → redirect to `/admin/claims`
- Page stays on `/admin/claims` and lists submissions (your earlier test claim should be visible)
- Reloading `/admin/claims` keeps you signed in

If for any reason it still fails after the SameSite change, the next step would be to inspect the response with logging in `adminCheckSession` to confirm whether the cookie header is arriving — but I don't expect to need that.

## Out of scope
- No changes to admin auth model (still shared password + HMAC cookie)
- No changes to email/notifications
- No changes to the submissions UI itself
- Job 3 (region × distance combos) stays queued until you confirm the login works
