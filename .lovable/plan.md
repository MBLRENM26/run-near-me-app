# Month filter — done

Shipped query-param month filtering on:
- 6 distance pages (`/5k-races`, `/10k-races`, `/half-marathons`, `/marathons`, `/trail-running-events`, `/ultra-marathons`)
- region pages (`/running-events/{region}`)
- region × distance combo pages (`/running-events/{region}/{distance}`)

URL format: `?month=YYYY-MM`. Pills show only months that have ≥1 event (next 12 months max). Canonical, title, h1 unchanged when filter is active. No new routes, no sitemap changes.

Files:
- new `src/lib/month-filter.ts` (helpers + `monthSearchValidator`)
- new `src/components/events/MonthFilter.tsx`
- `src/components/distance/DistancePage.tsx`, `RegionDistancePage.tsx` — render filter + apply
- `src/routes/running-events.$slug.tsx` — inline RegionPage updated, fetches `sort_date`
- `src/components/events/EventCard.tsx` — `sort_date?` added to `EventCardData`
- 8 route files (`*-races.tsx`, `half-marathons.tsx`, `marathons.tsx`, `trail-running-events.tsx`, `ultra-marathons.tsx`, `running-events.$slug.tsx`, `running-events.$slug_.$distance.tsx`) — added `validateSearch: monthSearchValidator`
- `src/lib/events.functions.ts` — bumped distance display cap from 60 → 500 so client-side filter has events to work with

Hybrid path stays open: if GSC later shows specific month combos earn traffic, promote those to static routes; everything else stays on query params.
