## Diagnosis

The build breaks on two files only:

- `src/routes/_adminShell.admin.clubs.index.tsx`
- `src/routes/_adminShell.admin.events.index.tsx`

Both are index routes whose generated IDs end in a trailing slash (`/admin/clubs/`, `/admin/events/`), but their `useNavigate({ from: "/admin/clubs" })` / `useNavigate({ from: "/admin/events" })` calls omit it. TanStack's typed router then can't resolve `from`, which cascades into the `search: (prev) => ({ ...prev, page: ... })` updaters — with no route scope, `page` is reported as an unknown search key.

This is unrelated to the CSRF / admin-session hardening from yesterday. Those touched `src/lib/admin-*` and `src/start.ts`; the failing lines are pure route-scope typing.

## Fix (narrow, presentation only)

In both files:

1. Change `useNavigate({ from: "/admin/clubs" })` → `useNavigate({ from: "/admin/clubs/" })` (and same for `/admin/events/`).
2. On every `navigate({ search: (prev) => ... })` call in those files, add `to: "."` so the updater is scoped to the current route and `page` types resolve.
3. Same treatment for the one `<Link search={...}>` in `_adminShell.admin.clubs.index.tsx:190` — give it `to: "."` (or `from` with trailing slash) so the search updater types.

No changes to business logic, DB, or the admin auth stack.

## Verification

- `bunx tsgo --noEmit` clean.
- Load `/admin/clubs` and `/admin/events`, click pagination — URL updates, list refetches.