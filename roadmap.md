# Roadmap (19 Oct 2026)

## Search recovery (agreed 19 Oct, from Plausible weekly report 18 Oct)
- [x] 1. Bing first: property verified + sitemap submitted 19 Oct (query/traffic data empty until Bing crawls — check back in ~1 week); IndexNow ping on new/changed pages (separate approval)
- [x] 2a. Month pages: shared month summary + new layout (weekend strip, region/type filters, weekend groups, related links, <3 races = noindex) — built 19 Oct, needs publish
- [ ] 2b. Later, separately: reuse month summary on region pages, Explorer, MCP; IndexNow on change
- [ ] 3. Google long game, race by race: course maps (agent data), confirmed 2027 editions, verified organisers

## Other open work
- [x] Approved stale-edition corrections (24 Oct): Brecons start 8 Jan 2027; York December held as unconfirmed; only Exeter Sunday duplicate redirected, Saturday preserved. Audit, rollback and browser acceptance: docs/renm/RENM-stale-edition-corrections-2026-10-24.md.
- [x] Archive six untouched September pilot notices through audited rejection; original evidence retained. Ten structured and 27 later supporting notices preserved.
- [x] Validate uploaded research: 212 evidence rows across 39 races; 73 club matches are plausible candidates, not accepted identities. See docs/renm/RENM-research-staging-preflight-2026-10-19.md.
- [x] Stage rich race facts — 212 assertions / 39 races privately imported and read back through signed-in admin; no event projection. Public fact acceptance/display remains separate approval.
- [x] Add monthly host-club links from existing accepted verified relationships — tested and preview-checked (24 clubs in Nov 2026); needs publish.
- [x] Scottish Athletics import (approved 26 Oct): three bounded page retries with 30-second timeouts; existing active Monday job moved to 05:30 UTC and read back. Retry code requires publish; no maintenance-window cause asserted.
- [x] Publish pending changes — published 21 Oct: race facts box on live event pages, month-page layout, host-club links, IndexNow daily ping verified live
- [ ] Review flagged older security-definer view
- [ ] Homelab checker script — Mike's homelab; needs CHANGE_FEED_SECRET
- [ ] Stage enrichment-agent results (dead sites, club-hosted races, verified organisers, course maps) slice by slice
- [ ] Organiser TBC/Unknown review; Scottish club websites; 233 hidden records

- [ ] Search traffic check-in ~31 Oct 2026: compare GSC (baseline 24 Sep–21 Oct: 60 clicks, 7,435 impr, pos 16.4) and Bing (baseline 20 Oct: 28 clicks, 726 impr); check month/race-details pages appearing. Blocked on: time.

- [ ] Search snippet test (shipped 24 Oct 2026): race pages now show checked facts in Google title/description. Baseline: Great Bentley Half 2027 462 impr / 1 click (pos 9.2); Petts Wood 10K query 374 impr / 1 click (pos 7.8); Carnethy Skyloop 181 / 1. Compare at ~31 Oct and ~7 Nov.

- [ ] Smaller search engines (24 Oct 2026): Brave finds the site for "runningeventsnearme" but not for 4 race-name searches (Great Bentley, Adnams, Petts Wood, Carnethy); Mojeek showed nothing (may be blocking automated checks). Robots file allows all crawlers. Recheck ~31 Oct. Yandex Webmaster: waiting on Mike's verification code.
