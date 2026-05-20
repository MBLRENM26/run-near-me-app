## Problem

Two related routing bugs in the admin section:

1. **`/admin/login` shows the admin header (with the "Submissions" button)** — because `src/routes/admin.tsx` is both the `/admin` route *and* the parent layout for every `admin.*.tsx` file, including `admin.login.tsx`. The login screen is being wrapped in the authenticated chrome.
2. **`/admin` renders only the empty shell** — there is no `admin.index.tsx`, so visiting `/admin` shows the header but no body and no redirect.

## Fix

Use a TanStack pathless layout so only authenticated admin pages inherit the header, and give `/admin` an explicit redirect.

### File changes

1. **Create `src/routes/_adminShell.tsx`** (pathless layout, underscore prefix → no URL segment).
   - Move the entire header/layout JSX currently in `admin.tsx` here.
   - Renders `<Outlet />` for child routes.

2. **Rename `src/routes/admin.claims.tsx` → `src/routes/_adminShell.admin.claims.tsx`**.
   - No code changes inside; the file just gets nested under the pathless layout so it still resolves to `/admin/claims` but now renders inside `_adminShell`.

3. **Replace `src/routes/admin.tsx` with `src/routes/admin.index.tsx`**.
   - Delete the old layout file (its contents moved to `_adminShell.tsx`).
   - New `admin.index.tsx` is a tiny component that calls `adminCheckSession` and `navigate({ to: res.authenticated ? "/admin/claims" : "/admin/login" })`. Shows "Loading…" while the check runs.

4. **`src/routes/admin.login.tsx`** — no edits. Because it is no longer a child of `admin.tsx` (deleted) and not under `_adminShell`, it renders standalone with no admin header. Password show/hide toggle already in place.

### Resulting routes

```
/admin           → admin.index.tsx (redirects based on session)
/admin/login     → admin.login.tsx (standalone, no header)
/admin/claims    → _adminShell.admin.claims.tsx (inside admin header)
```

### Verification

- Visit `/admin/login` while logged out → bare login card, no "Submissions" link.
- Visit `/admin` while logged out → redirects to `/admin/login`.
- Visit `/admin` while logged in → redirects to `/admin/claims`.
- Visit `/admin/claims` while logged in → header + submissions list (unchanged).
- `routeTree.gen.ts` regenerates automatically on dev/build.

### Out of scope

No backend, session, email, or submissions-logic changes. Job 3 (region × distance combos) still pending separately.
