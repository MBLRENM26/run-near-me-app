# RENM soft-404 residual acceptance result

Checked: 14 August 2026 at 11:51 UTC

Target: `https://runningeventsnearme.com`

Deployment: `462ccf0f5f4e13960d40acda19f042effd791757ebe9c478e2613d33992c224b`

Package: `renm-soft404-residual-2026-08-13`

## Result

| Cohort                     | Passed | Total |
| -------------------------- | -----: | ----: |
| Canonical candidates       |     41 |    43 |
| Direct duplicate redirects |     13 |    13 |
| Retired Athens paths       |      2 |     2 |

The first live probes and the complete harness agree that:

- the Dartmoor survivor returns `200`;
- both Granite aliases return direct `301` responses to that survivor;
- all 13 reviewed aliases redirect directly without a chain;
- both Athens paths return real `404` responses;
- aliases and Athens are absent from the current sitemap;
- 41 canonical candidates pass status, canonical, robots, SSR fact, metadata,
  structured-data, official-link and sitemap checks.

The sitemap was requested with a unique query string so the result reflects
the current database rather than the public one-hour CDN cache.

## Residual failures

### YTRRC September 5K

URL: `/events/ytrrc-5k-spring-summer-series-september`

The database now holds the reviewed organiser `Yeovil Town RRC`, but the name
is not present in server-rendered HTML and the page has no event-specific
official or entry destination. The current event template renders the
organiser name inside the primary-CTA block, so a record without a trusted
link also loses its supported organiser identity from the page.

This is a real presentation/source gap, not a migration failure. The page is
not in the clean GSC set. A correction should render a supported organiser
name independently from CTA availability; an external link must still require
current organiser evidence.

### Regents Park November

URL: `/events/regents-park-5k-10k-november`

The page returns `200`, self-canonicalises, emits no `noindex`, contains Event
JSON-LD and passes the reviewed fact/link checks. It is nevertheless absent
from a fresh sitemap response.

This is a real page/sitemap indexability inconsistency. Before changing code
or data, inspect the current ACTIVE siblings used by the sitemap's normalised
name grouping and compare them with the per-page sibling query. The page is
not in the clean GSC set until the two surfaces agree.

## Clean canonical set

The clean set is the manifest's 43 canonical candidates except the two
residual failures above: 41 URLs.

```text
/events/dartmoor-way-100-full-circle
/events/the-cardiff-morun-cardiff-2026
/events/run-durham-hamsterley-remembrance-day-5-10-miler-2026
/events/gainsborough-morton-10k-half-marathon-2
/events/chepstow-running-festival-august-2
/events/borders-8-hour-challenge
/events/dunoon-ultra-marathon-relay
/events/middlesbrough-10k
/events/white-horse-gallop
/events/leeds-running-festival-august
/events/ponton-plod
/events/armada-athletics-network-5k-september
/events/othnesberys-revenge
/events/speyside-windfarm-challenge
/events/hertfordshire-half-marathon-10k-2
/events/highland-fling-race
/events/william-wallace-running-festival
/events/speyside-way-50k-100k
/events/scottish-half-marathon
/events/kirkcaldy-parks-running-festival-half-marathon
/events/chelmorton-chase
/events/killin-10k-5k-fun-run
/events/scottish-10k
/events/perth-10k-festival
/events/the-jon-ward-hereford-5k-2026
/events/thorpe-park-5k-10k-september
/events/littlehampton-10k
/events/flying-monk-malmesbury-10k
/events/running-grand-prix-oulton-park-august
/events/ten10ten-sheffield
/events/carsington-water-10k-half-marathon-august
/events/peterhead-3k-junior-mile-august
/events/kingston-half-marathon
/events/henley-river-half-marathon-10k-september
/events/dorney-lake-half-marathon-10k-5k-november
/events/wirral-10k
/events/windsor-womens-10k
/events/running-grand-prix-goodwood-october
/events/town-moor-exhibition-park-5k-10k-october
/events/run-heaton-5k-10k-half-marathon-october
/events/windsor-trail-run-half-marathon-10k-august
```

This is an eligibility record only. No GSC validation was requested.

## Residual-failure correction (pre-deployment, 14 August 2026)

Package: `renm-soft404-residual-correction-2026-08-14` (code only; no database
mutation, no migration change, no deployment, no GSC action).

Changes:

- `src/lib/event-indexability.ts` — added `hasMeaningfulOrganiser`
  (placeholder-insensitive: `TBC`, `TBA`, `n/a`, `unknown`, `-`),
  `intrinsicNoindexReason` and `isEligibleSibling`. `computeIndexability` now
  competes only genuinely eligible siblings for the canonical slot; the
  earliest-upcoming rule among eligible siblings is unchanged, and rows that
  are themselves past, slug-suffix duplicates or placeholder-only orphans stay
  noindex.
- `src/lib/events.functions.ts` and
  `src/routes/api/public/admin/indexability-stats.ts` — both surfaces now pass
  full sibling rows, so per-page and sitemap eligibility use one rule.
- `src/routes/events.$slug.tsx` — organiser identity moved into an
  `OrganiserLine` component rendered in mutually exclusive branches, so a
  supported organiser name appears with or without a trusted CTA. No external
  link is derived from the organiser fact and aggregator URLs are still never
  rendered.

Observed evidence (local dev build at `http://localhost:8080`, not production):

- `/events/ytrrc-5k-spring-summer-series-september` returns `200` and the
  server-rendered HTML now contains `Organised by: Yeovil Town RRC`; the slug
  appears once in a freshly requested sitemap.
- `/events/regents-park-5k-10k-november` emits no `noindex` and appears once
  in a freshly requested sitemap; the placeholder-only October sibling is
  absent from the sitemap, as intended.
- Full unit suite: 127 tests passing across 20 files, including the new
  `event-indexability.sibling-eligibility` (9) and
  `event-organiser-rendering` (5) regressions. Full TypeScript check clean.
- `npm run verify:soft404 -- --base-url http://localhost:8080` is not a valid
  local signal: the harness asserts absolute production canonical and sitemap
  URLs, so every canonical row fails on host mismatch against a local server.
  Redirect (13/13) and retirement (2/2) cohorts still pass locally.

No production acceptance is claimed. The two residual URLs remain outside the
clean set until the corrected build is deployed and
`npm run verify:soft404` passes against `https://runningeventsnearme.com`.

