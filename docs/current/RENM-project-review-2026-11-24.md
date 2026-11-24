# Traffic check, project judgement and warning fixes

## Bing and search traffic (26 Oct – 24 Nov 2026, site analytics)
- Search engines: 1,161 visits. Bing 593, DuckDuckGo 321 (uses Bing results), Yahoo 114 (also Bing), Ecosia 52, Google 52.
- Bing and its partners bring about 1,080 of the 1,161 search visits, so they are now the main search source.
- Search visitors behave well: about 1.9 pages per visit, and only 28% leave after one page.
- Top search landing pages are month lists (half marathons Nov–Mar, 10Ks Dec/Jan, "running events November").
- Most of the 11,310 total visits were "direct" (no referrer), mostly desktop, mostly China, Singapore and Hong Kong, with 98% leaving after one page. These visits should not be counted as runners.
- The earlier Plausible exports showed about 400 visitors a month clicking through to race sites. Those are hand-offs, not confirmed entries.

## Is it worth keeping?
- Real use is small but genuine: about 1,100 search visits a month that look like runners, almost all from Bing.
- The thing that works is month race lists that send people to the official race site. That supports the original thesis, but at hobby scale.
- Google has not recovered (about 50 visits a month). It is a long game and is not guaranteed.
- No money and no organiser value has been shown yet. The planned 120–150 day experiment ends around January 2027.

Recommendation: keep it running in low-maintenance mode until the end of the experiment, then decide using three numbers:
1. Search visits a month (now about 1,100). Continue if above about 2,000 by late January. Stop major work if still flat.
2. Visitors clicking through to race sites (now about 400 a month).
3. At least one real organiser or club conversation from a small manual pilot.

Suggested time budget: about 2–4 hours a week, spent mainly on keeping data correct (dates, 2027 editions, pins). Do not build new features or pages until the January review.

## Outstanding tasks, triaged
Do now (low effort, protects what works):
- Publish pending coverage, Scottish import and duplicate-fact changes, then check the next Scottish run and coverage report.
- Fix the warnings below.
- Seven missing map pins: resolve only where the venue is confirmed.

Keep, minimal effort:
- Kent calendar lead trial (expires 4 Dec 2026). At expiry, judge it on the number of useful leads.
- Confirmed 2027 editions for races that already get traffic.

Park until the January review:
- Stage the remaining enrichment slices, organiser TBC review, Scottish club websites, cleaning up 233 hidden records.
- Reusing month summaries on region pages, the Explorer and MCP; course maps; Yandex/Brave/Mojeek checks.
- Homelab checker (still needs Mike's secret).
- Snippet test and search check-in roadmap items: close them as superseded by this review.

## Warning fixes (approved)
1. Admin event search: filter characters in the search box can change which records come back. Strip or escape those characters before the search runs.
2. Admin sign-out: an old admin session still works after signing out. Make sign-out invalidate the session server-side, and reject sessions issued before the latest sign-out.
3. Database: the public events view runs with its creator's permissions. Switch it to run as the caller, and grant read access on only the public columns it exposes, so public pages keep working.
4. Database info notes: tables with security on but no rules are intentionally private (server-only). No change. Missing indexes on linked records: add them (low risk, performance only).

## Other ways to make it useful (pivot options)
What is actually valuable: a checked, up-to-date UK race calendar with correct official links. That can be delivered in places other than the website. Ranked by effort versus likely value:

1. Embeddable race widget for clubs and organisers (best first test). A club or race pastes one line on its own site and shows "upcoming races near us" or its own race card, always current. It needs a small public widget page plus a copy-paste snippet, with a "powered by" link back to the site. That also builds trust links, which helps search. Effort: about 1–2 weeks. Test it with the 5-organisation manual pilot.
2. AI assistant access (already partly built). The site already has an MCP connection that AI assistants can use to answer "races near me". Listing it in AI tool directories costs little, but demand there is unproven (1 AI visit this month).
3. Calendar feed. Runners subscribe in Google or Apple Calendar to "half marathons in the South East", and races appear and update automatically. Effort: a few days. It gives repeat use without sending emails.
4. Data feed or API for clubs, running shops and apps. This could earn money, but it needs licence clarity from the sources (England Athletics and others) first. Not before the January review.
5. Browser extension or WordPress plugin. A WordPress plugin is really option 1 packaged for club sites, so worth doing only if the widget gets uptake. A browser extension has little reason to exist.

A full pivot is not recommended. The widget and calendar feed reuse the same data and can run alongside the site. Treat them as the January-gate experiment, not new work now. Requirements before any of them: stable public event IDs (already in place), a public read-only endpoint limited to the safe public columns, rate limits, and "check the official page" wording in every embed.

## Technical details
- `src/lib/admin-events.functions.ts` listAdminEvents: escape `q` for PostgREST `.or()`. Remove `,()*\` and quote it, or switch to separate filtered queries. Cap the length. Add a unit test that a comma in the search does not add filters.
- Admin session: add a server-side revocation record (session id or issued-at "not before"). The logout server function writes it, and the session check in the admin middleware rejects revoked or older sessions. Add a test.
- Migration: `ALTER VIEW public.events_public_v1 SET (security_invoker = true)`. Before applying, confirm that anon/authenticated have column-level SELECT on the `events` columns used by the view, plus a narrow RLS policy matching the view's own filter, without exposing `source`/`source_url`. Verify public pages and the Explorer with Playwright, and check that anon cannot read private columns. If grants cannot be made safely narrow, keep definer mode and record the reason instead.
- Migration: add covering indexes for the 21 unindexed foreign keys.
- Update roadmap.md with the triage and the January decision gate. Add "January gate: widget / calendar-feed pilot" to roadmap.md. Save the review as `docs/current/RENM-project-review-2026-11-24.md`.
- Rerun the security scan and the linter afterwards. Run the admin and event tests.
