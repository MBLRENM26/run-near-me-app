# Search Console indexing read — August 2026

## What the two screenshots say

Coverage is healthy and improving, not deteriorating.

- Indexed: 8.85k pages, rising in three visible steps (mid-May, mid-June, early July) from roughly 8k.
- Not indexed: 1.63k across 9 reasons.

Not-indexed breakdown:

| Reason | Pages | Source | Read |
| --- | --- | --- | --- |
| Excluded by 'noindex' | 632 | Website | Intentional — our own rule (past events, `-race-N` series copies, orphans, non-earliest duplicate siblings, admin, `/search`, `/explore`, report and claim pages) |
| Soft 404 | 551 | Website | Needs investigation — the one genuinely open item |
| Page with redirect | 64 | Website | Intentional — duplicate-slug 301s |
| Alternative page with proper canonical | 51 | Website | Intentional — canonical consolidation working |
| Not found (404) | 46 | Website | Intentional — hidden/removed events |
| Server error (5xx) | 1 | Website | Single sample; worth confirming it is not recurring |
| Crawled – currently not indexed | 60 | Google systems | Google's quality/priority call, not a defect |
| Discovered – currently not indexed | 222 | Google systems | Crawl-budget queue; trending down after a June spike |
| Duplicate, Google chose different canonical | 1 | Google systems | Was the headline problem earlier; now effectively resolved |

Two clarifications on what the panel does not mean:

- "Validation: Failed" is about the validation attempts started earlier in the remediation cycle, not about new breakage. A validation fails if any sampled URL in the batch still shows the reason, even when the aggregate count has fallen.
- Roughly 1.4k of the 1.63k not-indexed pages are the intended outcome of deliberate rules. Only Soft 404 (551) and the single 5xx are unexplained.

## Recommended next step: bounded read-only soft-404 diagnosis

Do not change code, schema, data or publication state yet. Establish evidence first.

1. Export the Soft 404 URL sample from the Search Console UI (the page-list under that reason, up to 1,000 rows) and hand it over as a CSV.
2. Classify every sampled URL against the current live app by route family: event detail, distance page, distance×month page, county, city, region, parkrun region, club, permitted-race list, other.
3. For each URL, record the live response status, whether `meta robots` is noindex, whether it is present in `sitemap.xml`, and how many events the page actually renders.
4. Identify the dominant pattern. The likely candidates, in order, are: thin discovery pages returning 200 with zero or near-zero qualifying events after the organiser-owned-link gate; noindexed event pages still listed in the sitemap; and legacy URL shapes that should be 410 rather than a live empty page.
5. Confirm whether the single 5xx is reproducible on the current head.

Output: a dated read-only finding document in `docs/renm/` with per-family counts, the named dominant cause, and a shortlist of candidate remediations — no implementation.

## Why not fix now

Soft 404 has a small number of possible causes with very different fixes (empty-state handling, sitemap eligibility, or 410 tombstones). Picking one before the URL sample is classified risks noindexing or tombstoning pages that should stay indexable — the exact failure mode that produced the earlier over-aggressive month-suffix rule. Each remediation package is then approved separately with its own migration, rollback, tests and production acceptance evidence.

## Technical notes

- Indexability logic lives in `src/lib/event-indexability.ts`; event-page headers and robots meta in `src/routes/events.$slug.tsx` plus `src/lib/event-response-headers.ts`.
- Sitemap generation is `src/routes/sitemap[.]xml.tsx`, which already excludes noindexed URLs by intent — step 3 verifies that holds in production.
- Discovery surfaces filter on `hasOrganiserOwnedLink` and `DISCOVERY_EVENT_COLUMNS`, so an empty-but-200 landing page is a plausible soft-404 source.
- The diagnosis is SELECT-only queries plus live HTTP reads; no cron, sync, migration or deploy activity.
