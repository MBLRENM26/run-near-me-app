## Why the region pages 404

There is no route file for `/running-events/$slug` in `src/routes/` — only `__root.tsx` and `index.tsx` exist. So every URL like `/running-events/south-east` legitimately 404s. Fix = create the routes.

The 12 slugs map cleanly to the DB values by replacing `-` with ` ` and title-casing each word — except `east-of-england` where "of" stays lowercase. I'll handle that with an explicit slug→region lookup so it's robust and reusable.

## Plan

### 1. Shared region helper
Create `src/lib/regions.ts`:
- Export `REGIONS` — array of `{ slug, name }` for all 12 regions (single source of truth, names matching DB exactly).
- Export `slugToRegion(slug)` and `regionToSlug(name)` helpers.

### 2. Region listing route
Create `src/routes/running-events.$slug.tsx`:
- `createFileRoute("/running-events/$slug")`
- `head()` with region-specific `title` ("Running Events in {Region} — UK"), `description`, `og:title`, `og:description`.
- Loader-free; component uses `useQuery` to fetch events filtered by `region = <name from slug>`, ordered by `name`.
- If slug is not in `REGIONS`, throw `notFound()` in `beforeLoad`.
- Required boundaries: `errorComponent` and `notFoundComponent` (per project rules).
- Page layout: reuse `Header` / `Footer` / `EventCard`. Show H1 "Running events in {Region}", count, and a responsive grid of event cards (no distance shown — no user coords on this page; pass cards without `distanceMiles`).
- Small "Back to all events" link to `/`.

### 3. EventCard tweak
`EventCard` currently expects `distanceMiles`. Make it optional so cards render without a distance pill on region pages. Purely presentational change.

### 4. Root route notFound
Confirm `__root.tsx` has a `notFoundComponent` (project requires it). Add one if missing — minimal "404, go home" block.

### 5. Homepage "Browse by region" section
In `src/routes/index.tsx`, add a new section below the results section (always visible, regardless of whether `coords` is set):
- Heading "Browse by region".
- Responsive grid (2 cols mobile → 3 → 4) of `<Link to="/running-events/$slug">` cards.
- Each card: region name + small chevron, styled with existing semantic tokens (`bg-card`, `border-border`, hover `border-primary`).

### 6. Footer / Header (optional, not doing unless asked)
No nav changes — request only mentions homepage grid.

## Files touched
- `src/lib/regions.ts` (new)
- `src/routes/running-events.$slug.tsx` (new)
- `src/routes/index.tsx` (add region grid section)
- `src/components/events/EventCard.tsx` (make `distanceMiles` optional)
- `src/routes/__root.tsx` (verify/add `notFoundComponent`)

`routeTree.gen.ts` regenerates automatically.
