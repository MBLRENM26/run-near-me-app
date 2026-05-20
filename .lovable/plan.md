# Region × Distance combo pages — spec

72 long-tail SEO landing pages: 12 UK regions × 6 distances. URL pattern:
`/running-events/{region}/{distance}` (e.g. `/running-events/scotland/half-marathons`).

## 1. Route structure

Use TanStack file-based nested route: **`src/routes/running-events.$slug.$distance.tsx`**.
- `$slug` = region slug (reuses the existing region vocabulary in `src/lib/regions.ts`)
- `$distance` = the existing distance page slug (`5k-races`, `10k-races`, `half-marathons`, `marathons`, `trail-running-events`, `ultra-marathons`) — same strings already used by top-level distance pages, so URLs and internal links stay consistent.

`beforeLoad` validates both params; throws `notFound()` if either is unknown. A slug map (`distance-slug → DistanceKey`) lives next to `DISTANCE_PAGES` in `src/lib/distance-filters.ts`.

The existing `/running-events/$slug` (region overview) keeps working — TanStack matches the more-specific 2-segment route first.

## 2. Data layer

New server function in `src/lib/events.functions.ts`:

```ts
getEventsByRegionAndDistance({ regionSlug, distanceKey })
  → { events: DistanceEvent[], total, distanceTotalAllRegions, regionTotalAllDistances, otherDistanceCounts }
```

- Query filters: `status = ACTIVE`, future or null `sort_date`, UK bbox, `region = <regionName>`, plus the same JS-side `matchesDistance()` filter the distance pages already use.
- Returns up to 60 events for display plus `total` for the heading.
- Extras drive the sparse-combo UX and cross-linking:
  - `otherDistanceCounts: Record<DistanceKey, number>` — counts of the other 5 distances *in this region*, so we can render a "Try a different distance in {Region}" panel with live numbers.
  - `distanceTotalAllRegions` — total UK-wide count for this distance, used in the empty-state link.

One round-trip pulls all active rows for the region (small) and we bucket in JS — same approach as `getEventsByDistance`.

## 3. Sparse-combo handling

Not every combo will have events (e.g. ultras in London). Strategy:

| Combo size | Behaviour |
|---|---|
| `total ≥ 3` | Fully indexed page. Listed in sitemap. Standard layout. |
| `1 ≤ total ≤ 2` | Page renders normally but emits `<meta name="robots" content="noindex, follow">` and is **omitted from the sitemap**. Avoids thin-content SEO hits while staying useful if a user lands on it. |
| `total = 0` | Same as 1–2: rendered, `noindex, follow`, omitted from sitemap. Page shows an empty-state with two CTAs: "See all {distance} races in the UK" and "See all running events in {Region}". |

Page always renders (no 404 for valid region+distance combos) so internal links and direct visits stay alive — Google just won't index the thin ones.

## 4. Page layout

New presentational component **`src/components/distance/RegionDistancePage.tsx`** mirroring `DistancePage.tsx`:

```text
Header
Breadcrumb: Home › Running events › {Region} › {Distance}
H1: "{Distance label} in {Region} {YEAR}"      e.g. "Half Marathons in Scotland 2026"
Intro: 1-sentence regional flavour + total count
DistanceNav (scoped — links go to /running-events/{region}/{distance})

[event grid — EventCard, same as distance pages]
  or empty-state block if total = 0

"Other distances in {Region}" grid (5 tiles, with counts from otherDistanceCounts)
"{Distance label} in other UK regions" grid (11 tiles, links to sibling combos)
"Find a parkrun in {Region}" link (existing parkrun region page)

FAQs (reuse cfg.faqs from DISTANCE_PAGES — already distance-specific and useful)

Footer
```

`DistanceNav` gets a small extension: an optional `regionSlug` prop. When set it renders links to `/running-events/{region}/{distance-slug}` instead of `/{distance-slug}`. Used on both the combo page and the region overview page.

## 5. Head meta & JSON-LD

In the route's `head()`:

```text
title:        "{Distance label} in {Region} {YEAR} — Running Events Near Me"
description:  "Find {total} upcoming {distance label} in {Region} for {YEAR}. Browse dates, entry fees and links to enter."
                (fallback copy when total = 0)
canonical:    https://runningeventsnearme.com/running-events/{region}/{distance}
og:url, og:title, og:description, og:type=website
robots:       "noindex, follow"  ← only when total < 3
```

JSON-LD scripts (per leaf):
1. **CollectionPage** — `name`, `description`, `url`, `about: { @type: Place, name: regionName }`.
2. **BreadcrumbList** — Home → /running-events/{region} → current page.
3. **FAQPage** — built from `cfg.faqs` (reused from existing distance config).

No og:image until we have a useful one.

## 6. Sitemap strategy

Extend `src/routes/sitemap[.]xml.tsx`:

- Add one batch call: `getRegionDistanceMatrix()` server fn that returns
  `{ regionSlug, distanceSlug, total }[]` for all 72 combos in a single query
  (same fetch pattern as `getEventsByDistance` but bucketed by region+distance in JS).
- Include only entries with `total ≥ 3`, `priority: 0.7`, `changefreq: weekly`.
- All 72 routes stay reachable via internal links regardless; only "fat" combos get sitemap entries. This matches the on-page `robots` directive.

`robots.txt` needs no changes.

## 7. Internal linking changes

Three small edits to wire these pages into the existing graph:

1. **`/running-events/{region}` (region overview)** — replace the current generic `<DistanceNav />` with `<DistanceNav regionSlug={slug} />` so the 6 pills deep-link into the combo pages, and add small `(count)` next to each pill from a new `getDistanceCountsForRegion` call (or fold into the existing region loader).
2. **`/{distance}` (distance landing pages)** — in the existing "by region" grid in `DistancePage.tsx`, change the link target from `/running-events/$slug` to `/running-events/$slug/{cfg.slug}` so each region tile lands on the combo page instead of the broad region page. Counts shown are already distance-scoped, which is what users expect.
3. **Combo page itself** — sibling-distance grid + sibling-region grid (described in §4) provide the lateral linking that makes the 72-page cluster crawlable.

## 8. Files to create / change

Create:
- `src/routes/running-events.$slug.$distance.tsx`
- `src/components/distance/RegionDistancePage.tsx`

Edit:
- `src/lib/events.functions.ts` — add `getEventsByRegionAndDistance` and `getRegionDistanceMatrix`.
- `src/lib/distance-filters.ts` — add `slugToDistanceKey()` helper + region-aware metadata helper.
- `src/components/distance/DistanceNav.tsx` — optional `regionSlug` prop.
- `src/components/distance/DistancePage.tsx` — region tiles link to the combo page.
- `src/routes/running-events.$slug.tsx` — distance pills link into combos, with counts.
- `src/routes/sitemap[.]xml.tsx` — append fat combos.

`src/routeTree.gen.ts` regenerates automatically.

## 9. Verification

- Visit `/running-events/scotland/half-marathons` → events list + correct H1, canonical, FAQ JSON-LD, breadcrumb JSON-LD.
- Visit `/running-events/london/ultra-marathons` (likely zero) → friendly empty-state, `noindex, follow` in head, two fallback CTAs.
- View source of `/sitemap.xml` → fat combos present, sparse combos absent.
- `/running-events/scotland` → distance pills link to `/running-events/scotland/{distance}` and show per-distance counts.
- `/half-marathons` → "by region" tiles link to `/running-events/{region}/half-marathons`.

## 10. Out of scope

Custom hand-written regional FAQ copy (we reuse the per-distance FAQs — good enough and already accurate). Per-combo og:images. Admin/CMS for editing combo intros. Programmatic detection of which combos to *promote* in nav beyond the existing region/distance landing pages.
