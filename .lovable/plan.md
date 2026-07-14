# Current plan

## Shipped this pass
- B3 taxonomy landing pages live: `/england-athletics-permitted-races`, `/tra-permitted-races`, `/club-organised-races`, `/welsh-athletics-permitted-races`, `/athletics-ni-permitted-races`.
- FAQ copy fixes: "a few pounds less" phrasing on all three home-nation pages; TRA governing-body claim tightened.

## Next (scheduled, not backlog): Scottish Athletics governance backfill
Resolves the asymmetry the new WA/NI FAQ copy calls out (naming SA as a sibling governing body while we have zero SA-tagged events).

1. Migration: `scottish_athletics` already exists in the `governance` enum — verify, add if missing.
2. `src/lib/sync-scottish-athletics.server.ts`: set `governance = 'scottish_athletics'` on insert/upsert.
3. One-shot backfill: `UPDATE events SET governance = 'scottish_athletics' WHERE source = 'scottish_athletics' AND governance IS NULL;`
4. Once count clears ~20, add `/scottish-athletics-permitted-races` config to `TAXONOMY_PAGES` + route file (mirrors WA/NI).

## Then: B5 — extend discovery gate
Update `hasOrganiserOwnedLink` (or its call sites) to also admit events with a `TRUSTED_GOVERNANCE` value even when the only link is entry-platform. Before/after SQL count on discovery surfaces.

## Then: C — audience value pages
`/for-runners`, `/for-clubs`, `/for-organisers`. Static routes, own `head()`, footer + desktop "Why us" links. Reuse `site-faqs.ts`.

## Out of scope
- Bulk backfill of taxonomy from scraped fields (low ROI).
- Homepage nav redesign.
- Scottish Athletics organiser-URL capture (parked, separate workstream).
