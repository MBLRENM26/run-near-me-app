# RENM L3B-4 — City discovery consumer migration acceptance

Date: 7 August 2026
Status: implementation verified; merge, publish and live acceptance pending
Scope: migrate only the city landing-page and city sitemap-count reads from `public.events` to `public.events_public_v1`.

## 1. Starting state and approved boundary

- The verified merged application baseline was `6a360e20c17af8cc31c9bced07d28a35b4717d14`, with local and origin `main` matched before implementation.
- `src/lib/city.functions.ts` contained two direct base-table reads: `fetchEventsNearCity` for city landing pages and `getCityEventCounts` for sitemap eligibility and counts.
- Mike separately approved the read-only preflight and then the bounded implementation.
- No database, eligibility, lifecycle, trust, radius, threshold, routing, rendering or dependency change was approved.

## 2. Read-only preflight evidence

The 7 August production-data comparison used the existing publishable credentials and issued SELECT requests only. It replayed the actual city bounding boxes, 25 km haversine filter, future-or-undated rule, `hasDiscoverableLink` gate and estimated-date ordering against both sources.

- all 40 configured cities checked;
- zero ordered-ID mismatches between ACTIVE base rows and view rows;
- 39 cities cleared `CITY_MIN_EVENTS = 10` from both sources; Dundee remained below the gate;
- bulk future-or-undated geocoded population: 2,831 base rows and 2,831 view rows;
- exact selected projection and deterministic ID order equality: true;
- sitemap eligible-city membership, ordering and counts equality: true.

This proves that replacing the two sources and removing the redundant ACTIVE predicates preserves the current city-page and sitemap result semantics for the observed production dataset.

## 3. Accepted implementation

Both queries in `src/lib/city.functions.ts` now use:

```ts
.from("events_public_v1")
.select(`${DISCOVERY_EVENT_COLUMNS}, lat, lng`)
```

The two `.eq("status", "ACTIVE")` predicates were removed because the accepted view already contains only ACTIVE rows. Existing bounding-box and coordinate filters, future-or-undated handling, pagination, ordering, haversine radius, link trust, event mapping, estimated-date sorting, distance bucketing and the 10-event publication threshold were retained.

The new `src/lib/city-consumer-projection.test.ts` guards that:

1. both city consumers query `events_public_v1`;
2. neither queries the `events` base table;
3. neither re-adds the redundant ACTIVE predicate;
4. every selected field, including `lat` and `lng`, remains inside the accepted 25-column projection.

## 4. Local verification

- targeted city regression: 4/4 passed;
- full Vitest suite: 53/53 passed across 9 files;
- TypeScript: `tsc --noEmit` passed;
- production build: passed in the existing non-synced Windows Temp verification copy, transforming 2,374 client modules and completing the Nitro/Cloudflare bundle.

No dependency installation or package-tree modification was performed in the OneDrive application repository. The isolated build reused the previously prepared Temp dependency tree and its local Windows path-separator workaround for `@lovable.dev/mcp-js`.

## 5. Scope boundaries

- No database migration, view definition, grant, RLS or event data changed.
- No eligibility, lifecycle, duplicate, link-trust, date, distance, radius, sitemap threshold, reminder or analytics rule changed.
- No package or lockfile changed.
- No other consumer was migrated.
- This document does not claim production acceptance until the change is merged, published and checked live.

## 6. Remaining acceptance

1. Review and commit only the bounded source, regression and governance files.
2. Push a `codex/` branch and merge through GitHub.
3. Republish the resulting GitHub merge in Lovable.
4. Check representative city pages and sitemap behaviour for rendering or permission errors.
5. Record the merged head and live observations, then mark L3B-4 complete.

## 7. Rollback

Change both city queries back to `.from("events")`, restore their `.eq("status", "ACTIVE")` predicates and remove the L3B-4 regression test. No database rollback is required.
