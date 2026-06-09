# Fix event card links + parkrun ordering in nearby results

## Problem 1 — Cards send visitors off-site to the wrong pages
The "View event" button on every event card is an external link to the scraped `entry_url`. For runabc-scraped events that URL is often a **generic regional listing** (e.g. `runabc.co.uk/kent` for Dartford Bridge 10K), so visitors leave your site and don't even land on the event. Your own event pages — with the new About copy, breadcrumbs and related races — are bypassed entirely.

### Fix
- **Card CTA goes internal, always.** "View details →" linking to `/events/{slug}`. The external link is removed from cards completely — the official site link lives on the event detail page where it belongs.
- **Parkrun cards link to their parkrun page** (`/parkrun-events/{slug}` or junior equivalent) instead of the generic event page, detected by name containing "parkrun".
- **Event detail page: demote generic listing URLs.** On `/events/{slug}`, if `entry_url` is a bare runabc regional page (path like `/kent`, `/scotland` — no event-specific path), it is no longer shown as the primary "Visit official event website" button. It drops to the small "Listed on runabc.co.uk" source attribution instead, consistent with the scraped-data trust rules. Event-specific URLs (eventrac, organiser sites, full event paths) keep working as the primary CTA.

## Problem 2 — Parkruns flood the top of nearby results
Results are sorted by distance only. Parkruns are dense (1,391 of them), so 3+ parkruns often sit above the actual races people came to find.

### Fix
- Nearby results split into two groups: **races first** (distance-sorted), then parkruns at the bottom under a small divider heading — "Free weekly parkruns near you" — also distance-sorted.
- The count line reads e.g. "12 events found · 4 parkruns".
- The "All / 5K / 10K…" filter still applies to both groups; choosing "5K" keeps parkruns in their bottom section.

## Where this applies
- Homepage nearby results (the main complaint)
- The same `EventCard` is used on distance/region pages, so the internal-link fix applies everywhere automatically.

## Technical details
- `src/components/events/EventCard.tsx` — remove external `<a>` CTA; always render internal `Link`; route parkruns (name match) to `/parkrun-events/$slug` / `/junior-parkrun-events` equivalents based on existing slugs.
- `src/routes/index.tsx` — partition `visibleEvents` into `races` / `parkruns` via name match; render parkrun group after races with divider heading; update count line.
- `src/routes/events.$slug.tsx` — add a `isGenericListingUrl()` check (runabc host + single non-event path segment) in the primary-CTA picker; demote to source attribution when matched.
- No database or schema changes; no changes to the radius RPC.

## Out of scope (flagged, not fixed here)
- Duplicate rows exist (two "Dartford Bridge 10K" entries — one runabc-scraped with the bad URL, one with the proper eventrac link). De-duplication of scraped vs. sourced events is a separate data-cleanup job worth doing soon.
