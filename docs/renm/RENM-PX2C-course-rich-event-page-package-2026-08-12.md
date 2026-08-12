# RENM — PX2C authorised course-rich event-page package

Status: candidate selected and embed route cleared; custom geometry/elevation implementation remains blocked on route-file permission and edition confirmation. No application, production-data, integration or deployment mutation is authorised by this document.

## Product question

Does a source-transparent course map and elevation profile make an RENM occurrence page materially more useful for choosing, understanding and returning to a race than the current flat details-and-destination page?

## Pilot gate

The pilot may start only when all of the following are recorded:

1. one named current RENM occurrence and stable slug;
2. the organiser or other rights-holder supplies the exact GPX file, or explicitly authorises RENM to use a named route file;
3. written permission covers public map display and calculation/display of distance, ascent, descent and elevation profile;
4. the route version and applicable edition/date are stated;
5. attribution, correction, withdrawal and replacement instructions are known; and
6. the file passes format, coordinate, distance and elevation sanity checks.

Public availability of a GPX link is not sufficient authorisation.

### Selected candidate: North Downs Run

The selected candidate is the canonical RENM occurrence `North Downs Run 2026` (`97761f95-1b3a-4096-a4a4-9c990547ad6b`, slug `north-downs-run-2026`), organised by Istead & Ifield Harriers and held on 28 June 2026. The live RENM page is retained after the event as an occurrence/result-or-future-date route to the organiser.

The organiser's North Downs Run page links Plotaroute route `2277816`. Plotaroute identifies it as `The North Downs Run 29th June 2025`, mapped by Colette Smith, with a 29.819 km mixed-terrain route and raw ascent/descent of 469 m. Plotaroute expressly permits route-map images or its interactive map to be used on websites. Therefore an attributed Plotaroute embed is cleared for a bounded prototype.

This does **not** yet clear RENM to download, store and re-publish the GPX geometry or derive its own Turf/Recharts metrics. The custom implementation gate requires organiser/route-owner confirmation that RENM may use route `2277816` in that way, and confirmation that the published 2025 geometry is the applicable course reference for the 2026 occurrence or a supplied replacement. Until then:

- the event is the named design and embed candidate;
- the course must be labelled as the organiser-published 2025 route reference, not an independently verified 2026 route;
- Plotaroute/map attribution and source links must remain visible;
- the page's current `Took place` and results/future-date behaviour must remain intact; and
- no database distance correction, GPX asset, custom elevation calculation or public code activation is authorised.

If the custom-use permission is not obtained, PX2C may test only the attributed Plotaroute embed or move the unchanged custom implementation contract to the first organiser who can satisfy the full gate.

## Bounded implementation

- After the full route-file gate is satisfied, add `@tmcw/togeojson` and the minimum Turf modules required for line length, cumulative distance and bounded geometry checks.
- Store one authorised GPX asset and a small reviewed metadata manifest in the repository. Do not add course columns or a generic course table.
- Parse the GPX outside the render path into a deterministic, versioned course-data module containing the route line, elevation samples, derived totals and provenance labels.
- Render the module only for the exact allow-listed event slug. Every other event page remains byte-for-byte equivalent apart from isolated shared imports where unavoidable.
- Use the existing client-only Leaflet pattern for the route map and existing Recharts primitives for the elevation profile.
- Retain the current event URL, canonical/indexability behaviour, trust strip, CTAs, SEO metadata and outbound-link policy.
- Label route data with source, route version/edition, last verified date and a correction/withdrawal route.

## First-page experience

The prototype should add a compact `Course intelligence` section after the core occurrence facts and before generic related-race content:

- course map with start/finish treatment and fit-to-route bounds;
- elevation profile linked by hover/focus to cumulative distance;
- supported facts: derived route distance, total ascent, total descent, minimum/maximum elevation and route type where evidenced;
- explicit source/provenance and edition applicability;
- useful honest states for unavailable elevation, multi-lap ambiguity or route subject to change;
- official entry/information and results destinations remain links, not copied operational or named-runner data.

No qualitative `flat`, `fast`, `PB`, `beginner-friendly` or technicality claim is shown unless a separately reviewed rule and evidence support it.

## Data and failure rules

- Reject malformed XML, non-track/route files, non-finite coordinates, out-of-range UK coordinates and implausible route length.
- Do not interpolate missing elevation into a claimed ascent figure. Show the map without an elevation chart when elevation evidence is insufficient.
- Derivation must be deterministic and covered by fixture tests.
- If parsing or rendering fails, the ordinary event page must continue to work and the course module must fail closed.
- Removing the allow-list entry and static asset is the rollback; no database rollback is required.

## Measurement

Instrument only prototype-specific behaviour with conservative names:

- course module viewed;
- map interacted with;
- elevation profile interacted with;
- course source opened;
- official/entry/results destination opened from the enriched page; and
- event returned to within the existing privacy-preserving analytics limits, if measurable.

These are interaction signals, not entries, registrations, satisfaction or organiser value.

## Acceptance

Before merge:

- organiser permission and asset manifest reviewed;
- parser/derivation, allow-list and failure-state tests pass;
- full tests, TypeScript, lint and production build pass;
- representative mobile and desktop visual acceptance passes;
- map keyboard/accessibility behaviour and console are clean; and
- ordinary non-pilot event pages show no regression.

After publication, retain the test only if it is understandable, performant and observably used. The single-page prototype does not itself justify PostGIS, `pg_trgm`, a general course schema, named results ingestion or a site-wide event-page redesign.

## Explicit exclusions

- no database migration or generic course administration UI;
- no scraping or unauthorised copying of route files;
- no Strava/Garmin dependency;
- no named runner results or result-row warehouse;
- no inferred series/edition relationships;
- no map on Explorer or other event pages; and
- no public activation before the pilot gate is satisfied and implementation is separately approved.
