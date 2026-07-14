B1, B2, and B4 are shipped. Remaining roadmap items in order:

## Next: B3 — Taxonomy landing pages

One route per high-signal taxonomy value, gated on a minimum event count (~20) so we don't ship thin pages.

Candidates to check counts for first:
- `/uka-permitted-races`
- `/scottish-athletics-permitted-races`
- `/club-organised-races`
- `/championship-races`

Each page ships:
- H1 + one hand-written intro paragraph (no AI prose per the scraped-data-trust rule)
- Standard event grid reusing `EventCard`
- `head()` with unique title, description, og:title/description
- Cross-links to related distance/region pages
- Sitemap entry

Shared plumbing:
- New server fn `getEventsByTaxonomy({ field, value })` in `src/lib/events.functions.ts` using `DISCOVERY_EVENT_COLUMNS` + `hasOrganiserOwnedLink` gate
- Small shared page component (mirrors `DistancePage` shape) at `src/components/taxonomy/TaxonomyLandingPage.tsx`
- Config file `src/lib/taxonomy-pages.ts` with slug/label/H1/intro/FAQ per value — same shape as `distance-filters.ts`

Only ship routes whose count clears the threshold; log the others as backlog.

## Then: B5 — Extend discovery gate

Update the `hasOrganiserOwnedLink` filter in `src/lib/link-trust.ts` (or its call sites) to also admit events with a trusted `governance` value (from `TRUSTED_GOVERNANCE` in `event-taxonomy.ts`), even if their only link is entry-platform. Verify with a before/after SQL count on discovery surfaces.

## Then: C — Audience value pages

Three static routes with their own `head()`:
- `/for-runners`
- `/for-clubs`
- `/for-organisers`

Each: hero, 3–5 value bullets, one CTA, one FAQ block reusing `site-faqs.ts`. Linked from footer + desktop header "Why us" menu (mobile nav unchanged).

## Order of operations

1. Query taxonomy value counts (SQL) — decide which B3 routes clear the threshold
2. Build shared taxonomy landing plumbing + ship the viable routes
3. B5 gate extension + count verification
4. C audience pages + footer/header links

## Out of scope

- Bulk backfill of taxonomy from scraped fields (low ROI, already deferred)
- Homepage nav redesign
- Scottish Athletics organiser-URL capture (still parked)

Approve and I'll start by pulling the taxonomy counts, then ship B3.