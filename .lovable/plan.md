# Fix: region × distance combo pages show all regional events

## Problem

`/running-events/scotland/half-marathons` currently renders the broad region page (all distances), not the filtered combo page. Root cause: TanStack file-based routing treats `running-events.$slug.$distance.tsx` as a **child** of `running-events.$slug.tsx`. The parent `RegionPage` component does not render `<Outlet />`, so the matched child combo component is never displayed. The user sees the parent's unfiltered query results.

This is confirmed in `src/routeTree.gen.ts`:

```text
'/running-events/$slug':            parent
'/running-events/$slug/$distance':  path: '/$distance'   ← registered as nested child
```

## Fix

Opt the combo route out of nesting using TanStack's trailing-underscore convention on the parent segment.

Rename:

```text
src/routes/running-events.$slug.$distance.tsx
        →  src/routes/running-events.$slug_.$distance.tsx
```

The `$slug_` (with trailing underscore) tells the router: "same URL path, but do **not** nest under `running-events.$slug`". The URL `/running-events/scotland/half-marathons` stays identical; route tree regenerates so the combo route is a top-level leaf, no parent layout involvement, and the filtered `RegionDistancePage` renders directly.

No code changes needed inside the route file itself — params, loader, head, component all stay as-is. `routeTree.gen.ts` regenerates automatically.

## Verification

1. `/running-events/scotland/half-marathons` → H1 reads "Half Marathons in Scotland 2026", grid contains only events whose `distances` matches the half-marathon filter (e.g. "Half Marathon", "Half Marathon, 10K", "Kirkcaldy Parks ... Half Marathon"). 10K-only events like "Croy 10K" must be absent.
2. `/running-events/south-east/half-marathons` → same expectation, scoped to South East.
3. `/running-events/scotland` → still works, still shows the broad region page with distance pills.
4. `/running-events/london/ultra-marathons` → still renders the sparse-combo empty state with `noindex, follow`.

## Out of scope

- No changes to filter logic (`matchesDistance`), data layer (`getEventsByRegionAndDistance`), or component (`RegionDistancePage`) — all of those are already correct; they just weren't being rendered.
- Sitemap, internal linking, JSON-LD — unchanged.
