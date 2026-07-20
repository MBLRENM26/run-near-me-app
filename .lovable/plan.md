## Backlog note

- Admin "incomplete events" backlog: split the single `incomplete_any` filter into per-gap chips and rescope the "Backfill missing tags" button so it only claims to re-derive distance/terrain tags from the event name. The current 5,029 count conflates six unrelated gaps (town, date, distances, lat, region, terrain_tags) and makes the backfill button look ineffective. Realistic backfill impact is a subset of the 3,064 empty-terrain rows, only those whose names contain a terrain keyword.

## Diagnosis

Clicking "Let us know" on an event page navigates to `/events/<slug>/report` but the page content doesn't change — it just scrolls to the top. The report form and its server function both exist and work; the problem is route nesting.

`src/routes/events.$slug.tsx` (the event detail page) and `src/routes/events.$slug.report.tsx` (the report form) share the `events.$slug` prefix, so TanStack Router treats `events.$slug.tsx` as the **layout parent** of the report route. `routeTree.gen.ts` confirms this: `EventsSlugReportRoute` is registered with `getParentRoute: () => EventsSlugRoute` and the parent is wrapped as `EventsSlugRouteWithChildren`.

For that nesting to render the child, the parent must return `<Outlet />`. The event detail page does not — it renders the full event UI. Result: navigating to `/events/<slug>/report` re-matches the same event page (the child never mounts), and the only visible effect is the router scrolling to top.

## Fix

Rename `src/routes/events.$slug.report.tsx` → `src/routes/events_.$slug.report.tsx`.

TanStack Router's trailing-underscore convention on a path segment (`events_`) opts the route **out of nesting under `events.$slug`** while keeping the URL exactly `/events/$slug/report`. The event detail page stays a leaf; the report route becomes a sibling top-level route. No component changes, no Outlet plumbing, no impact on the event page.

Inside the renamed file, update the two `createFileRoute` / `useParams` references from `/events/$slug/report` to `/events_/$slug/report` so the generated types match the new file id. The outbound `<Link to="/events/$slug/report">` on the event page keeps working — the URL path is unchanged.

## Verify

1. Load an event page, click "Let us know" — the report form should render.
2. Submit a test report and confirm it lands in `/admin/submissions` as `kind='edit'` linked to the event.
3. Check `routeTree.gen.ts` regenerates with `EventsSlugReportRoute` as a top-level route (no `EventsSlugRouteWithChildren`).
