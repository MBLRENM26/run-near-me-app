## Goal

Remove the temporary `[admin-auth-diag]` logging added last turn. The published-URL issue was a stale deploy — the auth code itself is fine.

## Changes

1. **`src/lib/admin-date-enrich.functions.ts`**
   - Drop the `getRequestHeader` import.
   - Drop `diagnoseAdminAuth` from the `admin-session.server` import.
   - Restore `requireAdminOrThrow` to its original two-line form.

2. **`src/lib/admin-session.server.ts`**
   - Remove the exported `diagnoseAdminAuth` function.

## Out of scope

- No behaviour changes to auth, cookies, or the enrichment flow.
- No other files.
