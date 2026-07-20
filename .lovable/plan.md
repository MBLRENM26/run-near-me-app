## What's breaking

TanStack Start upgraded and now requires an explicit CSRF stance for server functions. The dev server is emitting:

> TanStack Start server functions are not protected by the CSRF middleware.

Because it's thrown during SSR, the render aborts and the build reports unsuccessful. Our own same-origin check in `admin-csrf.server.ts` only wraps admin mutations — TanStack wants a framework-level middleware covering **all** server functions.

## Fix (single file: `src/start.ts`)

Add TanStack's built-in CSRF middleware to `requestMiddleware`, scoped to server-function calls:

```ts
import { createStart, createMiddleware } from "@tanstack/react-start";
import { createCsrfMiddleware } from "@tanstack/react-start/server";
// ...existing imports

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
```

(If the exact import path differs in the installed version, I'll resolve to the correct one — the message above shows the exact API TanStack expects.)

## Why this over disabling the warning

- Framework-level defense covers every server function, not just admin.
- Our custom `assertSameOrigin` in admin functions stays as defense-in-depth.
- Public webhook routes under `src/routes/api/public/*` are file routes, not server functions, so they're unaffected (they still verify signatures themselves).

## Verification

1. `bun run typecheck` passes.
2. Dev-server logs no longer show the CSRF warning or aborted renders.
3. Smoke test: load `/`, `/admin`, and submit `/list-your-event` — all continue to work.

No schema changes, no other files touched.