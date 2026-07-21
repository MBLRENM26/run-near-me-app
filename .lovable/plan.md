## Diagnosis

This does look like a broader class of bug rather than a single bad line.

The latest dev-server log available here only shows `createServerFn().inputValidator()` deprecation warnings, not the current production-build failure. However, the codebase still contains several routes using the same fragile typed-navigation pattern that caused the previous errors: `navigate({ search: ... })` without an explicit same-route target, and route-local navigation not consistently scoped through the generated route object.

This is probably why it feels like the bug is being moved around: TypeScript reports the next route where TanStack Router cannot infer the search shape, we patch that instance, then another similar instance surfaces.

## Plan

1. **Capture the real current failing signal first**
   - Run the project’s typecheck/build command once and capture the full error list.
   - Do not assume the remaining failure is the same unless the output confirms it.

2. **Fix the navigation pattern across the affected class**
   - In route components that call search-only navigation, prefer the generated route hook:
     - `const navigate = Route.useNavigate()`
   - For same-route search updates, make the target explicit:
     - `navigate({ to: ".", search: ... })`
   - Apply this consistently to the routes already identified as using this pattern, including:
     - `/admin/claims`
     - `/admin/club-claims`
     - `/admin/organiser-identities`
     - `/running-clubs/`
     - any route surfaced by the fresh typecheck/build output

3. **Keep admin/auth hardening separate**
   - Do not unwind yesterday’s security hardening unless the build output directly points to it.
   - The current pattern I can verify is route/navigation type inference, not CSRF/session logic.

4. **Verify the fix at the correct level**
   - Re-run typecheck/build after the navigation cleanup.
   - If new errors remain, group them by category before patching so we do not continue one-error-at-a-time.

5. **Optional follow-up after the build is green**
   - Add a small route-navigation hygiene pass: avoid unscoped `navigate({ search: ... })` in route files with `validateSearch` so this does not recur when new filters/pagination are added.