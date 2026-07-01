## SEO landing page expansion

Phased. Only Phase 1 is spec'd for build now — later phases wait for their own approval so we can absorb what Google does with Phase 1 first.

---

### Phase 1 — City pages (radius-based, 25 km)

**Route:** `/running-events-in-city/$city` — separate namespace from `/running-events-in/$county` so the two never collide and the internal-link graph stays clean.

Alt considered: reuse `/running-events-in/$slug` and disambiguate in the loader. Rejected — the URL then loses semantic clarity for both crawlers and users, and the county page's `head()`/JSON-LD would need forking. New namespace is cheaper.

**City registry** — `src/lib/cities.ts`, one hand-curated file. ~40 rows:

```ts
export type City = {
  slug: string;      // "manchester"
  name: string;      // "Manchester"
  county: string;    // "Greater Manchester" (breadcrumb + county-page chip filter)
  region: RegionSlug; // links to existing region page
  lat: number;
  lng: number;
};
```

Seed list: London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Bristol, Newcastle, Nottingham, Leicester, Coventry, Bradford, Cardiff, Belfast, Edinburgh, Glasgow, Aberdeen, Dundee, Swansea, Brighton, Reading, Southampton, Portsmouth, Plymouth, Norwich, York, Oxford, Cambridge, Bath, Exeter, Derby, Stoke, Wolverhampton, Sunderland, Middlesbrough, Milton Keynes, Hull, Preston, Blackpool, Bournemouth. Any city under the ≥10 threshold is kept in the registry but won't publish a page or sitemap entry.

Coordinates hand-typed once from Wikipedia. No geocoder call at runtime.

**Radius filter — how the query works**

No PostGIS / earthdistance in the DB. Two-step filter that stays fast:

1. Bounding-box `WHERE` in SQL — `lat BETWEEN c.lat ± 0.225` and `lng BETWEEN c.lng ± (0.225 / cos(lat_radians))`. 25 km ≈ 0.225° lat. Cuts the row set to a few hundred max.
2. Exact haversine in JS on the returned rows — drop anything with true distance > 25 km. Sort by `sort_date`.

Runs in `getEventsForCity({ slug })` in `src/lib/city.functions.ts` — mirrors the `getEventsForCounty` shape and uses the same `DISCOVERY_EVENT_COLUMNS` + `hasOrganiserOwnedLink` filter, inheriting every link-trust and non-UK guard already in place.

**Threshold** — page only renders if ≥10 qualifying events within 25 km. Below that, `throw notFound()` in `beforeLoad`. Log the failing cities so we can prune the seed list on the next pass.

**Page layout** — mirrors the county page (`src/routes/running-events-in.$county.tsx`):

- H1: "Running events in {City} 2026"
- Sub: "{N} upcoming races within 25 km of {city centre}"
- Distance-mix chips (5k / 10k / half / marathon / trail / ultra with counts) — see "Distance-mix chips (non-interactive)" below.
- Event card grid, sorted by date.
- Bottom: "Nearby cities" (3 closest registry cities within 80 km) + "Also in {region}" link back to the region page.

**Distance-mix chips (non-interactive)** — until Phase 4 ships the city × distance route, these render as plain `<span>` pills styled identically to the inactive `DistanceNav` pill (same rounded-full border, padding, count-in-parens format), with `aria-disabled="true"` and `title="Coming soon"`. No `<a href>`, so no dead links or wasted crawl budget. Phase 4 swaps `<span>` → `<Link>` in one edit.

**Head + JSON-LD** — copies the county pattern: self-referencing canonical + og:url, ItemList (top 50) + BreadcrumbList (Home → Region → City). No og:image.

**Sitemap** — extend `src/routes/sitemap[.]xml.tsx` to emit one URL per city that passes the ≥10 threshold. Uses the same `getCitiesWithEvents()` helper the loader uses, so a city dropping below threshold falls out of the sitemap automatically.

**Internal links** — factor a shared `ChipLinkRow` primitive out of `DistanceNav` so distance / region / city / (future) month chips all share one look. Then:

- **Homepage** — new section "Browse by city" under the existing region strip. Chip row, top ~12 cities by qualifying event count. Same visual as the distance and region strips already there.
- **County page** — small chip row under the H1, listing the registry cities whose `county` field matches (usually 0–3 chips). Kent → Canterbury; Greater Manchester → Manchester; London → all London cities. Nothing rendered when there are none.

**What's out of scope for Phase 1**
- Working distance filter on the city page (Phase 4).
- Month filter on the city page (Phase 3).
- Auto-populating the city list from event density.
- Per-city radius tuning (fixed 25 km constant).

---

### Later phases (each needs its own approval before build)

- **Phase 2 — County × distance combos.** Extend `getEventsForCounty` with the distance filter that already exists on `getEventsByDistance`, mirror the region × distance page shape. ~48 counties × 6 distances, sparse-page guard reuses the ≥1 event rule from the region × distance system.
- **Phase 3 — Month pages for regions & terrains.** New routes `running-events.$slug.$month.tsx` and `{fell,trail,road,multi-terrain}-races.$month.tsx`. Reuses `parseMonthSlug` and `getEventsForMonth` — mostly wiring.
- **Phase 4 — Distance × month deeper cuts.** `/marathons/$month` already exists. This phase adds city × distance (activating the currently-static chips) and possibly year variants (`/marathons-2027`) once the 2027 calendar fills out. Speculative — revisit late Q3 when Search Console data on Phase 1-3 lands.

---

### Technical notes

- Radius math in JS to avoid adding PostGIS. Bounding-box pre-filter keeps the read cheap.
- All new SELECTs use `DISCOVERY_EVENT_COLUMNS` — no `source` / `source_url` leaks.
- All CTA/link decisions go through `classifyEventLink`; discovery lists filter by `hasOrganiserOwnedLink`.
- Non-UK guard already applied at the DB level; coastal cities (Plymouth, Portsmouth, Bournemouth) safely fall inside the box.
- Threshold + sitemap self-pruning means we can seed 40 cities knowing thin ones just won't publish.
- Shared `ChipLinkRow` primitive keeps homepage strips (distance / region / city / future month) visually consistent — no design detour.
