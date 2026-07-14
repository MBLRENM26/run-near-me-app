# Navigation, tools, and guides proposal

Raised after shipping Workstream C (audience pages) and the report-a-change flow. The core concern: the site has strong SEO landing pages but poor wayfinding — users can't easily discover the taxonomy hubs, audience pages, city/county pages, or governance pages we've already shipped.

## Option A — Refresh primary navigation first
Highest UX leverage. Group existing pages into a coherent browse structure.

- Distances: 5k, 10k, half marathons, marathons, ultra marathons
- Terrain: road races, trail running events, fell races, multi-terrain races
- Governance: England Athletics, Scottish Athletics, Welsh Athletics, Athletics NI, TRA permitted races, club-organised races
- Regions: existing region landing pages
- Why us: for runners, for clubs, for organisers

Shapes to choose from:
1. Mega-menu on desktop + slide-out drawer on mobile (most discoverable, more build)
2. Simple header dropdowns extending the current "Why us" pattern (fastest, consistent)
3. Single /browse hub page with a slimmer header (lowest header complexity, one extra click)

## Option B — Free race tools hub
Pure client-side tools under /tools. Big long-tail SEO value, low maintenance once shipped.

Candidates, in priority order:
1. Pace calculator (distance + time → pace, or pace + distance → time)
2. Race time predictor (Riegel formula)
3. Pace charts for 5k / 10k / half marathon / marathon (each its own indexable page)
4. Splits / negative-split planner

## Option C — Blog / guides section
Evergreen guides under /guides. Higher ongoing content cost but strong topical authority.

Seed ideas:
- How to choose your first 5k
- UKA vs ARC permits explained
- Trail vs fell — what's the difference
- How to read a race listing (link trust, governance badges)
- What to do if your race is postponed

## Recommended sequencing
1. Navigation refresh (unlock everything already built)
2. Tools hub (evergreen SEO win, no content debt)
3. Guides (needs sustained writing and editorial process)

## Open decisions for tomorrow
- Which nav shape?
- Which tools to ship first?
- Do we want /guides or /blog URL?
- Should tools get their own header dropdown or live under /tools only?
