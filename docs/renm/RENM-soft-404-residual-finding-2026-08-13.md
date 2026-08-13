# RENM — Soft 404 residual classification (read-only finding)

Date: 13 August 2026
Method: full sweep of all 551 URLs in the Google Search Console
Coverage-Validation export (`runningeventsnearme.com-Coverage-Validation-2026-08-13.zip`),
fetched live from production with redirects followed; classified by final HTTP
status, presence of a `noindex` robots directive, and rendered (script/style
stripped) text length.

Evidence label: **Observed evidence** — one live sweep on 13 Aug 2026. No app,
schema or data mutation was made.

## Aggregate classification (551 URLs)

| Live state | Count | Interpretation |
| --- | --- | --- |
| 200 with `noindex` | 271 | Already demoted by existing indexability rules |
| 404 | 154 | Already removed / hidden |
| 410 with `noindex` | 78 | Affirmative terminal removal |
| 200, indexable | 48 | **Residual set** — still live and indexable |

So 503 of 551 (91.3%) of the flagged URLs are already addressed by remediation
that post-dates Google's June 2026 crawl of these URLs. The GSC report is
pre-remediation data; re-requesting validation is the correct next action.

## Residual set (48 URLs)

47 are `/events/*` occurrence pages; 1 is a region landing page.

### Region landing page anomaly (1)

`/running-events/south-west` returns 200 but its server-rendered HTML contains
only `Loading events…` — the event list is fetched client-side, so a crawler
sees a page with no listings (465 chars of text). This is a distinct defect
class from thin occurrence pages and affects region landing pages generally,
not just South West. Recorded here as a finding only; no fix applied.

### Thin occurrence pages (47)

Rendered text length ranges 1,219–2,787 chars (median ≈ 2,020). These are
genuinely live, upcoming, indexable pages whose unique content is limited to
stable structured fields (name, distance, location, date) with no course,
organiser-owned link, or route enrichment.

| URL | Rendered text chars |
| --- | --- |
| /running-events/south-west | 465 |
| /events/athens-authentic-marathon | 1219 |
| /events/dartmoor-way-granite-50 | 1448 |
| /events/dartmoor-way-100-full-circle | 1450 |
| /events/the-cardiff-morun-cardiff-2026 | 1481 |
| /events/run-durham-hamsterley-remembrance-day-5-10-miler | 1516 |
| /events/ytrrc-5k-spring-summer-series-september | 1612 |
| /events/gainsborough-morton-10k-half-marathon | 1652 |
| /events/chepstow-running-festival-august | 1740 |
| /events/borders-8-hour-challenge-2 | 1742 |
| /events/dunoon-ultra-marathon-relay | 1743 |
| /events/middlesbrough-10k | 1765 |
| /events/run-exe-summer-5k-september | 1774 |
| /events/white-horse-gallop | 1829 |
| /events/leeds-running-festival-august | 1832 |
| /events/ponton-plod | 1853 |
| /events/armada-athletics-network-5k-september | 1871 |
| /events/othnesberys-revenge | 1876 |
| /events/speyside-windfarm-challenge | 1881 |
| /events/hertfordshire-half-marathon-10k | 1903 |
| /events/highland-fling-race | 1944 |
| /events/william-wallace-running-festival | 1945 |
| /events/speyside-way-50k-100k | 1986 |
| /events/scottish-half-marathon-north-listing | 2001 |
| /events/kirkcaldy-parks-running-festival-half-marathon | 2023 |
| /events/chelmorton-chase-2 | 2031 |
| /events/killin-10k-5k-fun-run | 2032 |
| /events/scottish-10k | 2039 |
| /events/perth-10k-festival | 2044 |
| /events/jon-ward-hereford-5k | 2051 |
| /events/thorpe-park-5k-10k-september | 2051 |
| /events/littlehampton-10k-2 | 2059 |
| /events/flying-monk-malmesbury-10k | 2101 |
| /events/running-grand-prix-oulton-park-august | 2160 |
| /events/ten10ten-sheffield | 2182 |
| /events/carsington-water-10k-half-marathon-august | 2190 |
| /events/peterhead-3k-junior-mile-august | 2197 |
| /events/power-of-5k-race-1 | 2200 |
| /events/kingston-half-marathon-2 | 2217 |
| /events/henley-river-half-marathon-10k-september | 2238 |
| /events/dorney-lake-half-marathon-10k-5k-november | 2272 |
| /events/wirral-10k | 2323 |
| /events/windsor-womens-10k | 2384 |
| /events/running-grand-prix-goodwood-october | 2429 |
| /events/town-moor-exhibition-park-5k-10k-october | 2457 |
| /events/regents-park-5k-10k-november | 2531 |
| /events/run-heaton-5k-10k-half-marathon-october | 2729 |
| /events/windsor-trail-run-half-marathon-10k-august-2 | 2787 |
## Conclusions

1. The 551 Soft 404s are dominated (91%) by URLs already demoted, removed, or
   terminally gone since the June crawl. No further code change is required for
   them; validation should be re-requested in Search Console so Google recrawls.
2. The 47 residual thin occurrence pages are the only genuine remaining
   candidates for either enrichment (course/route/organiser-owned data via the
   PX2 packages) or demotion under the existing indexability rules.
3. Region landing pages render their listings client-side only. This is a
   separate, higher-leverage SEO defect than page thinness and should be scoped
   as its own package.

## Boundaries observed

No CTA, trust, discovery, indexability, schema or production-data change was
made in producing this finding. Recommendations above require separate approval.
