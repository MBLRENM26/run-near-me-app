# Show up on the smaller search engines

## What's already covered
- **Browsers don't index sites. Search engines do.** Brave, Firefox, Opera, Vivaldi, Safari and Edge each show results from a search engine.
- **Bing (done)** also powers DuckDuckGo, Yahoo, Ecosia and most "private" search, plus ChatGPT search and Copilot.
- **IndexNow (done, daily)** already notifies Bing, Yandex, Seznam, Naver and Yep each time a page changes.
- **Our robots file** lets every crawler in, so Brave's own crawler can already read the site.

## What's left to do
1. **Brave Search.** Brave doesn't offer a sign-up or a way to submit a sitemap. It finds sites by crawling and through Brave users' browsing. Next step: check whether we're in its results with a few race-name searches, and record what we find. There's no registration step to do.
2. **Yandex Webmaster.** Verify the site and submit the sitemap. This is a small job, but there's little UK traffic, so it's optional.
3. **Mojeek** (an independent UK engine). It has no submission tool. We'd only confirm it isn't blocked.
4. **AI answer engines** (Perplexity, ChatGPT, Claude). Keep them allowed in the robots file and confirm none are blocked. No change is expected.

## Not doing
- Paid "submit to 500 search engines" services. They don't help and can look spammy.

## Technical details
- Yandex verification: add a `yandex-verification` meta tag to `__root.tsx` head, publish, then verify and submit `sitemap.xml` in Yandex Webmaster. This needs Mike's Yandex account.
- Brave check: search the Brave Search web results for 5 race names and record the positions in `roadmap.md` next to the Bing and Google baseline.
