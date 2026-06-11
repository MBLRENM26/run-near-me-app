## Goal

Two small upgrades to the event detail page (`/events/{slug}`) to make interlinking smarter:

1. The "It's one of **107 10K races** taking place in London…" sentence in the *About this race* paragraph should be a clickable link to that region+distance page.
2. The "More 10K races in London" list under the paragraph should show the **geographically nearest** events to this race (not just the next-by-date in the same region), when we have lat/lng.

---

## 1. Linkify the in-prose count

Currently `buildAboutParagraph()` returns a plain string and the page renders it inside `<p>`. To embed a real `<Link>` we change the contract:

- Refactor `buildAboutParagraph` to return a structured result instead of a string:
  ```
  { sentence1: string; sentence2: string | null; countSentence: { before: string; linkText: string; after: string } | null }
  ```
  `linkText` is the "107 10K races in London" fragment; `before`/`after` are the surrounding prose (e.g. "It's one of " … " this season — find more below.").
- In `events.$slug.tsx`, render the paragraph as JSX. When `countSentence` is present and we have a `regionSlug` + `comboSlug`, wrap `linkText` in a `<Link to="/running-events/$slug/$distance" params={{ slug: regionSlug, distance: comboSlug }}>`. Fallback (region only, no distance bucket): link to `/running-events/$slug`. If neither is available, render plain text.
- Existing thresholds unchanged: still only mentioned when `regionCount >= 5`.
- Existing 3 phrasing variants preserved — each variant just yields different `before`/`after` text around the same `linkText` template.

This is the only place an in-body link to a distance page is added; the existing "View all 107 10K races in London →" link at the bottom of the related list stays as-is (it's already a link, just reinforced now).

## 2. Nearest events instead of next-in-region

Today `getEventPageData` returns up to 6 same-region, same-distance events ordered by `sort_date`. We'll prefer **nearest by distance** when the current event has `lat`/`lng`.

Approach (server-side, inside `getEventPageData`):

- If `event.lat` and `event.lng` are set:
  - Call the existing `events_within_radius` RPC with a growing radius (try 25 mi → 75 mi → 200 mi until we have at least 6 candidates with a slug). Cap at 200 mi so we still degrade gracefully for isolated events.
  - Filter results to the same distance bucket using `matchesDistance(row.distance_type, cfg)` when `related.distanceKey` is set; otherwise return them unfiltered.
  - Exclude the event itself, take the first 6, and attach `distance_miles` so the UI can show "X miles away".
- If lat/lng is missing (legacy rows), keep today's region+sort_date behaviour as the fallback.
- `totalCount` (used by the "View all N …" footer link and the prose count) **continues to come from the region+distance query** — that's the number the about-paragraph and footer CTA are talking about ("107 in London"). Only the 6 displayed rows change source.

UI changes in `events.$slug.tsx`:

- Heading stays "More {distance} {in region}" when we still have a region context, but each row also shows the mileage when present, reusing `formatDistance(miles)` from `src/lib/distance.ts` (e.g. "Sat 12 Sept · Camden · 2.3 miles away").
- When the nearest-by-distance path is used, the row order is by `distance_miles` ascending, not by date.
- No new component — extend the existing `<ul>`/`<li>` block.

## Out of scope

- No change to the bottom "View all 107 … →" link itself (it already routes to the combo page).
- No new distance pages, sitemap entries, or schema fields.
- Entry-fee policy and link-trust rules untouched.

## Files touched

- `src/lib/event-description.ts` — change return type + small refactor of `s3`.
- `src/lib/events.functions.ts` — extend `RelatedEvent` with optional `distance_miles`; add nearest-by-radius path to `getEventPageData`.
- `src/routes/events.$slug.tsx` — render about paragraph as JSX with embedded `<Link>`; show miles on related rows.

No DB migration. No new server function. Builds against existing `events_within_radius` RPC and the new Big Half / Vitality 10K rows (both have lat/lng) will be ideal first test cases.
