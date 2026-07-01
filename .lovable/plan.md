## Homepage discovery updates

Two changes to `src/routes/index.tsx`, no data or backend work.

### 1. New "Browse by terrain" section (pill chips)

Add a new section below the existing "Browse by distance" strip, above the parkrun callout.

- Heading: **Browse by terrain**
- Subhead: "Road, trail, fell and multi-terrain races across the UK."
- Reuse `ChipLinkRow` with 4 pill chips (same styling as the distance chips):
  - **Road races** → `/road-races`
  - **Trail running events** → `/trail-running-events`
  - **Fell races** → `/fell-races`
  - **Multi-terrain races** → `/multi-terrain-races`
- Order: Road, Trail, Fell, Multi-terrain (most common first).
- No counts (kept static like the city strip — no per-request fetch).

### 2. Convert "Browse by city" from pills → region-style cards

The current city strip uses `ChipLinkRow` pill chips. Replace with the same bordered card + chevron pattern the region grid uses.

- Keep the same `CITY_STRIP` list (12 cities) and `<Link to="/running-events-in-city/$city">` target.
- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (matches region grid exactly).
- Card markup: `flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium ...` with a trailing `ChevronRight`.
- Subhead tweak: current copy says "Races within 25 km" — leave unchanged.

### Final homepage section order

1. Hero + location prompt
2. Results (when located)
3. Featured near you (when located)
4. Browse by region (cards)
5. Browse by city (cards — was pills)
6. Browse by distance (pills)
7. **Browse by terrain (pills — new)**
8. Parkrun / junior parkrun callout
9. Discover events across the UK

### Out of scope

- No new component files — inline the terrain chips using the existing `ChipLinkRow`.
- No changes to the terrain hub pages, the city hub pages, or any data queries.
- `CITY_STRIP` list unchanged.
- No icons on chips.
