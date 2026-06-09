# Event page enrichment — trustworthy fields only, scraped fees removed

GSC shows 4,542 pages "Discovered – not indexed" and 2,959 "Crawled – not indexed". Fix package: on-page content + internal links + breadcrumbs, built strictly from fields that can't go stale.

## Field trust rules

**Stated as fact (stable):**
- Name, distance, town, county, region.
- Date — estimated dates get "expected … date to be confirmed" phrasing.
- Live count of same-distance races in the region — counted from the database at render time, correct by construction (verified: 104 upcoming half marathons in the South East, 137 10Ks, 73 halves in London, 37 10Ks in Wales).

**Removed entirely (scraped-and-stale):**
- **Entry fee — gone from the page.** No fee bullet, no fee in the paragraph, no fee in the meta description, and the price is stripped from the Event JSON-LD offer (the offer keeps the entry link, just no price claim). Replaced everywhere by a pointer: *"Entry details and pricing are available on the official event website."* Real pricing comes back only when we have real data (claimed listings / organiser feed).
- **Organiser** — gone from prose (dissolved companies, ownership changes).

Final example paragraph:

> "The Brighton Half Marathon is a half marathon held in Brighton, East Sussex, taking place on Sunday 22 February 2026. Entry details and pricing are available on the official event website. It's one of **104 half marathons** in the South East this season — find more below."

Count safeguards: only shown when ≥ 5 (no weak "one of 2"); uses the same filters as the listing pages so the number matches what readers click through to; falls back to region-only ("one of 508 running events in the South East") when distance can't be bucketed.

## Longer-term content path (no build now)

`description_override` column later, populated via List Your Event, claimed listings, or an organiser feed — generated copy is the floor, owned copy replaces it page-by-page.

## The build

1. **"About this race" paragraph** — stable facts + live count, clause-gated on field presence, 3–4 phrasing patterns keyed off the slug so adjacent pages differ. Rendered in the page body.
2. **Scraped fee removed** — fee bullet deleted from the event page, fee clause deleted from meta description, price stripped from JSON-LD offers (entry link kept).
3. **"More {distance} races in {region}" block** — up to 6 upcoming same-distance/same-region events + "View all {count}" link to the region/distance combo page; same-region fallback. New `getRelatedEvents` server function returns the 6 events and the total count in one call.
4. **Breadcrumb trail + BreadcrumbList JSON-LD** — Home → {Region} → {Event} on event pages; JSON-LD only on parkrun pages.

## Not in this round

- Any fee or organiser claim anywhere on event pages.
- Fee data rebuild (future conversation — tiered pricing needs a schema rethink, likely organiser-supplied).
- The 6 soft-404s / 4 hard-404s — drop URL lists from GSC when convenient.
- No schema changes, no new pages, no redesign.

## Technical details

- New `src/lib/event-description.ts`: pure function from stable fields + `{ regionCount, distanceLabel }`; reuses `formatEventDate`; no fee/organiser inputs.
- `src/lib/events.functions.ts`: new `getRelatedEvents` — one Supabase query with `{ count: "exact" }` returning `{ events: [...6], totalCount, bucketed }` (region + distance match via `distance-filters.ts` patterns, `sort_date >= today`, `status = ACTIVE`, exclude self).
- `src/routes/events.$slug.tsx`: loader fetches event + related in parallel; removes the fee bullet and the `feeClause` from the meta description; strips `offer.price`/`priceCurrency` from Event JSON-LD (offer keeps `url` + availability); adds About section, related-links block, breadcrumb (existing shadcn breadcrumb), BreadcrumbList JSON-LD in `head()`.
- `src/routes/parkrun-events.$slug.tsx`: BreadcrumbList JSON-LD only (parkrun is genuinely free — "free" stays there since it's a property of parkrun itself, not scraped).
