# Search Console coverage read — 13 August 2026

## Verified facts from the export

The uploaded `Coverage-Validation` export is the Soft 404 issue list: 551 URLs, 550 of them `/events/{slug}` and one `/running-events/...`. Validation status in the file is `Pending` for 550 and `Failed` for 1, and the crawl dates are almost entirely June 2026 (547 of 551) — before the current remediation shipped. So the panel's "Failed" badge reflects the earlier validation cycle, not fresh breakage.

I re-checked 80 randomly sampled URLs from that list against the live site:

| Live state now | Count of 80 | Read |
| --- | --- | --- |
| 200 with `noindex` | 43 | Correctly demoted by our own indexability rule |
| 404 | 19 | Correctly removed |
| 410 Gone | 7 | Correctly tombstoned |
| 200, indexable, thin | 11 | The remaining real issue |

Extrapolated, roughly 86% of the 551 (about 475 URLs) are already resolved and will clear the bucket on the next validation pass. About 14% (roughly 75 URLs) are live, upcoming, indexable event pages that Google still judges as soft 404.

Cause of the residual group, confirmed by inspecting one (`/events/ten10ten-sheffield`): the page renders correctly but carries only ~2.2k characters of visible text, nearly all templated — one restated-fields paragraph, a reminder form, and two "more races" link blocks. Nothing distinctive to the race. That thinness, not a status-code or canonical error, is what Google is scoring.

## Recommended sequence

### Step 1 — Re-request validation (no code change)
In Search Console, click "Validate fix" on Soft 404 again. The June-crawled majority now returns 404/410/noindex, so the count should fall sharply on its own. This also gives a clean baseline before any content change.

### Step 2 — Classify the residual set (read-only)
Run the same live check across all 551 URLs, not a sample, and record status code, robots directive, visible text length, and whether the event is upcoming. Output the exact residual list of live-indexable thin pages, grouped by what they are missing (no organiser-owned link, no course data, no distance tags, no organiser name, minimal geography). Produce a dated finding document in `docs/renm/`. No app or data changes.

### Step 3 — Decide per group, then approve separately
Two candidate treatments, chosen per group from the step-2 evidence:

- **Enrich** where real structured facts exist but are not surfaced — course/route data from `event_course_sources`, organiser identity from the ORL, distance tags, nearby-event context. This stays inside the RENM rule that generated copy may only restate stable structured fields and live DB counts.
- **Demote** where no additional true fact exists. Extend the indexability rule with a content-sufficiency condition so a page with nothing beyond name/date/place is `noindex, follow` rather than an indexable thin page. It stays live for direct visitors.

Neither is implemented in this plan. Each becomes its own approved package with migration (if any), rollback, tests and production acceptance evidence.

## The other buckets, for completeness

Nothing else in the second screenshot is an open defect: `noindex` 632, redirect 64, alternate canonical 51, 404 46 are all intended outcomes of shipped rules. `Crawled – currently not indexed` 60 and `Discovered – currently not indexed` 222 are Google-side crawl/quality queues, with the discovered count trending down after the June spike. `Duplicate, Google chose different canonical` is down to 1 from the earlier problem state. The single 5xx is worth one reproduction check during step 2.

## Technical notes

- Indexability rule: `src/lib/event-indexability.ts`; robots meta and status overrides in `src/routes/events.$slug.tsx` with `src/lib/event-response-headers.ts`.
- Sitemap: `src/routes/sitemap[.]xml.tsx`, which already excludes noindexed URLs — step 2 confirms that holds in production for the residual set.
- Enrichment inputs already in the database: `event_course_sources`, `course_source_reviews`, ORL organisation tables, `distance_tags`.
- Step 2 is SELECT-only queries plus live HTTP GETs; no cron, sync, migration or deploy activity.
