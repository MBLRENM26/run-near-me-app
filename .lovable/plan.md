## Homepage layout reorder

All changes are in `src/routes/index.tsx`. No data/query changes — purely reordering JSX and adding one derived list.

### Before location is set (no `coords`)

Render in this order:

1. **Hero + LocationPrompt** (unchanged)
2. **Browse by region** grid — move up directly below the hero. Drop the `border-t` divider since it's no longer separating it from a results section.
3. **Discover events across the UK** — the existing upcoming-races section, with the heading renamed from "Upcoming races" to "Discover events across the UK". Subcopy stays ("A selection of races coming up across the UK.")

### After location is set (`coords` truthy)

Render in this order:

1. **Events near you** — existing `visibleEvents` results grid with `FilterBar`, count, empty state. Unchanged behaviour.
2. **Featured events near you** — new section. Derive from already-loaded `events`:
   - filter `is_featured === true`
   - require `latitude`/`longitude` present
   - compute `haversineMiles` to `coords`
   - keep those with `distanceMiles <= radius`
   - sort by distance
   - render only if `featuredNearby.length > 0`
   - heading: "Featured events near you"
   - reuses `EventCard` (already shows the Featured badge)
3. **Browse by region** grid — same component, rendered below for further exploration. Keep the `border-t pt-12` divider in this branch since it now separates results from regions.

### Implementation notes

- Add a `featuredNearby` `useMemo` next to `visibleEvents` with the same dependencies (`coords`, `events`, `radius`) — note it intentionally ignores `eventType` so the user always sees featured options near them.
- Hide upcoming-races section when `coords` is set (already the case via `!coords` gate — keep it).
- Browse-by-region block becomes conditional in styling only: render unconditionally, but its wrapper's top border is only needed in the "after location" branch. Simplest approach: keep one Browse-by-region block at the bottom of `<main>` (always visible), and remove the divider so it works in both states; the upcoming/featured sections above provide enough visual separation.

### Out of scope

- No query changes, no new DB calls, no schema changes.
- PostGIS RPC migration still pending (tracked separately).
