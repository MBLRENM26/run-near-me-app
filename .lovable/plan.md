# Fix: admin login is broken

## What's actually wrong

The admin login page renders, but signing in does nothing and the admin pages fail to load. This is not a password or session problem — the admin JavaScript never loads.

Confirmed from the dev server: requesting the admin session helper module returns a 500 with

```text
[import-protection] Import denied in client environment
  Denied by specifier pattern: @tanstack/react-start/server
  Importer: src/lib/admin-session.server.ts
  Trace: routeTree.gen -> routes/_adminShell.admin.events.index.tsx
         -> src/lib/admin-events.functions.ts
         -> src/lib/admin-session.server.ts
```

The cause: every admin server-function module imports the session helper at the top of the file:

```ts
import { isAdminAuthenticated } from "@/lib/admin-session.server";
```

Because route components import those `*.functions.ts` modules, the server-only session helper is dragged into the browser bundle graph. The framework's import protection rejects it, the admin route chunk fails to load, and the browser reports "Failed to fetch dynamically imported module". Login can never complete.

This affects 8 modules: `admin.functions.ts`, `admin-events`, `admin-clubs`, `admin-search`, `admin-notify`, `admin-date-enrich`, `admin-sync`, `organiser-identity`.

## The fix

Move the session helper import out of module scope and into each server-function handler, so it only ever loads on the server:

```ts
// remove the top-level import
export const something = createServerFn(...).handler(async () => {
  const { isAdminAuthenticated } = await import("@/lib/admin-session.server");
  ...
});
```

Where a file has a shared `requireAdmin()` helper, do the dynamic import inside that helper once rather than repeating it in every handler.

Also apply the same treatment to the login/logout path in `admin.functions.ts` (`issueAdminSession`, `clearAdminSession`, `verifyAdminPassword`) and to any admin CSRF helper imported the same way.

No behaviour, auth model, password, or database change — purely moving where the server-only module is loaded.

## Verification

1. Confirm `GET /src/lib/admin-session.server.ts` no longer 500s and the admin route chunks load.
2. Drive a real browser session: open `/admin/login`, submit the admin password, and confirm it lands on `/admin/claims` with the admin shell rendered and no console errors.
3. Load `/admin/events` and `/admin/sync-runs` to confirm the other admin chunks resolve.
