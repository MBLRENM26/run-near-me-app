## What’s going on

The current evidence points to a leftover TypeScript build blocker, not a new app/runtime failure:

1. `src/routes/events.$slug.tsx` has a `<Link to="/search">` with no `search` prop.
   - This route’s `/search` search params are typed, so TanStack Router requires an explicit `search` value even when it is empty/defaulted.
   - The same component pattern in `BackToSearchBar` already passes `search={{ q }}`.

2. The previous `crypto` issue appears mostly addressed in `admin-session.server.ts`.
   - The file now uses lazy dynamic imports inside functions, so the client bundle should no longer statically resolve `crypto` from that file.
   - I did still find top-level `crypto` imports in public API route files; those are server-route handlers and may be fine, but if the build still reports `__vite-browser-external` after the link fix, those are the next suspects to convert to Web Crypto / dynamic imports.

## Plan

1. Fix the typed search link in `src/routes/events.$slug.tsx`.
   - Add the required `search` prop to the tombstone CTA linking to `/search`.
   - Use the route’s default/empty search shape rather than changing search behavior.

2. Re-check for remaining build blockers.
   - If the build output still mentions `__vite-browser-external` or `crypto`, inspect the exact file named by the error.
   - Convert only that offending top-level server import to a runtime-safe pattern.

3. Keep the fix narrow.
   - No route restructuring.
   - No database changes.
   - No changes to public submission/admin logic unless a fresh build error names those files.

## Expected result

The build should clear the known `TS2741: Property 'search' is missing` error, and any remaining error will be isolated to a specific import if the prior crypto issue still exists elsewhere.