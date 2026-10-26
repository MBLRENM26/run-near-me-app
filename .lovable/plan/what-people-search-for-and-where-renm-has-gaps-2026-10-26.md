# What people search for, and where RENM has gaps

## What we know
- Plausible does not show search terms. The 28-day export shows landing pages only: month lists, Snake Lane 10 and the homepage.
- Semrush (UK, Google estimates) shows the biggest demand is "near me" searches: 10k races near me (~9.9k a month), half marathons near me (~8.1k), running events / running races near me (~3.6k each), 5k races near me (~2.9k) and running clubs near me (~2.4k).
- Searches by city or region are mid-sized: half marathon Scotland (~1.6k, low difficulty), half marathons London (~1.9k, hard), half marathon Manchester (~1.3k), 10k London (~1.3k), 10k races Yorkshire (~210, low difficulty).
- Race-feature searches: flat half marathons UK (~480, low difficulty) and trail half marathon (~320).
- Searches by month or year are small (half marathon November 2026 ~110), but those pages already convert well for us.

## Gaps
1. **"Near me" searches:** the distance pages exist but don't answer "near me" well. There's no prompt for location or postcode on the 10k, half, 5k and running-events pages.
2. **Distance pages for a place:** we have region × distance pages, but no city × distance pages. Examples: "half marathon Manchester", "10k London".
3. **Race features:** "flat half marathons" and "trail half marathons" have no page, even though accepted race facts (surface, terrain) could back one.
4. **Real search terms:** Bing Webmaster query data hasn't been pulled. That data reflects 50% of our traffic.

## Plan (stays within current boundaries: improve existing pages first, no bulk new pages)
1. **Pull real search terms** from Bing Webmaster Tools, plus Search Console if it's connected. Produce a short report: top searches, which page ranks, position and clicks. This is read-only.
2. **Improve existing distance pages for "near me" searches:** add a "Find races near you" postcode box that links into the existing Explorer search. Set titles and descriptions from the live counts. No new pages.
3. **Region × distance pages:** check that "half marathon Scotland" and "10k Yorkshire" point to the existing region × distance pages. Strengthen their titles and add month breakdowns from the shared month summary.
4. **Race-feature pages (gated):** draft a "flat half marathons" page backed only by accepted surface/terrain facts. Show it only if at least 8 future races qualify; otherwise noindex. This needs your approval as a new page type, so it comes after step 1's evidence.
5. **City × distance pages are deferred.** They expand the number of SEO pages, which current boundaries don't allow until the Explorer has shown results. Kent/South London stay offline.

## Technical details
- Step 1: one-off Bing connector calls to GetQueryStats and GetPageQueryStats; report saved to docs/current/.
- Step 2: edits to the head() and intro of 10k-races, half-marathons, 5k-races and running-events pages; postcode box routes to /explore with query params (no new data).
- Step 3: reuse src/lib/month-summary.ts; no schema change.
- Step 4: a pure tested filter over public accepted race facts (isPublicRaceFact); the page is noindex below the threshold.
