## Goal

Stop headless/bot traffic (mostly CN) from polluting Plausible analytics going forward, so visitor counts reflect real humans.

## Why this is happening

Plausible only counts clients that download and execute its JS. The CN traffic is therefore headless browsers (Puppeteer/Playwright/HeadlessChrome), uptime probes, or SEO scrapers rendering pages — not plain HTTP crawlers. Plausible has no server-side geo/UA filter, so the only reliable fix is to not call `plausible(...)` for those clients.

## Change

Extend the existing inline bootstrap script in `src/routes/__root.tsx` (the one that already gates on hostname) with a second gate that no-ops `window.plausible` when the client looks automated. If any of these are true, we skip loading the tracker:

1. `navigator.webdriver === true` (set by all mainstream headless drivers)
2. `!navigator.languages || navigator.languages.length === 0` (typical of default headless configs)
3. UA matches `/HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|bot|spider|crawl|preview|monitor|lighthouse|pagespeed|gtmetrix/i`
4. `window.outerWidth === 0 || window.outerHeight === 0` (offscreen/headless)

All checks are wrapped in try/catch and default to "load tracker" on error, so real users are never blocked.

## Out of scope

- No changes to the site UI, routing, or SSR.
- No changes to any server function or DB.
- No attempt to retro-clean historical Plausible data (not possible — use Plausible's dashboard "exclude country = China" segment for past periods).
- No aggressive `zh` language block by default (would risk dropping real diaspora users). Can be added later if bot traffic persists.

## Files touched

- `src/routes/__root.tsx` — the inline `scripts[0].children` string only. Nothing else.

## Verification

- Load the published site in a normal browser: `window.plausible` should still be a function and a pageview should fire (check network for `plausible.io/api/event`).
- Load via `curl` with a headless UA or open DevTools and set `navigator.webdriver = true` before reload: no request to `plausible.io` should occur.
- Watch the Plausible dashboard over the next few days — CN visitor share should drop toward the country's real diaspora baseline.

## Expected impact

Historical numbers stay as-is; new data should see a sharp drop in CN "Direct desktop" visitors and a corresponding improvement in bounce-rate and pages-per-visit realism.
