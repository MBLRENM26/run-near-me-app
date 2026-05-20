## Problem

The header logo is a `Link to="/"`. When you're already on `/` and click it, TanStack Router treats it as a no-op navigation — the `HomePage` component doesn't unmount, so the location, radius filter, and distance filter all stay set. Result: the logo appears to do nothing and you're stuck on the filtered view.

This also affects every other page indirectly: from any sub-page, clicking the logo navigates home, but if you'd previously set a location the home page would re-show the old filtered state from the in-memory state... actually that state is per-mount, so the only broken case is **clicking the logo while already on `/`**.

## Fix

Lift the homepage filter state into URL search params, and have the logo navigate to `/` with empty search. That way:

- Clicking the logo from `/` with filters active → URL changes from `/?lat=…&lng=…&radius=5&type=5k` to `/` → state resets, filtered view clears, hero + location prompt return.
- Clicking the logo from any other route → unchanged, still works.
- Bonus: filtered home state becomes shareable / back-button friendly.

### Implementation

1. **`src/routes/index.tsx`** — add a `validateSearch` (zod or hand-rolled) for optional `lat`, `lng`, `label`, `radius`, `type`. Read them with `Route.useSearch()` instead of `useState`. Update them via `navigate({ to: "/", search: (prev) => ({ ...prev, radius: 10 }) })` from `FilterBar` / `LocationPrompt` callbacks. Keep the existing query keys driven from these values.

2. **`src/components/site/Header.tsx`** — change the logo Link to explicitly clear search:
   ```tsx
   <Link to="/" search={{}} resetScroll>
   ```
   This forces a fresh `/` with no params, which resets all filter state.

### Lighter-touch alternative (if you'd rather not refactor to search params)

Keep state in `useState` but make the logo nuke it:

- Export a tiny zustand store (or use a ref + custom event) holding `resetHomeFilters`.
- Header logo `onClick` calls `resetHomeFilters()` before/after the Link navigates.
- `HomePage` registers the reset function on mount.

This is smaller but uglier — state lives outside the route, no URL sharing, and we add a store just for one button.

## Recommendation

Go with **option 1 (search params)**. It's the idiomatic TanStack Start fix, makes the filtered homepage linkable, and the logo Link with `search={{}}` becomes self-documenting. ~30 lines of churn in `index.tsx`, 1 line in `Header.tsx`.

## Out of scope

- No changes to combo pages, region pages, or any data-fetching logic.
- No visual/design changes to the header or homepage.
