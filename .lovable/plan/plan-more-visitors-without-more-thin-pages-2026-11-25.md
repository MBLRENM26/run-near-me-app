# Plan: more visitors without more thin pages

The site already has many listing pages, and the project rules say not to add lots of new search pages yet. So this plan grows traffic in two ways: links from club and organiser websites, and making the pages we already have work harder.

## 1. Embeddable race list for clubs and organisers (main build)
A small "Upcoming races" box that a club or organiser can paste onto their own website.
- Three versions: one club's races, one organiser's races, or races near a town (e.g. within 15 miles of Dartford).
- Shows race name, date, distance and town, with each race linking to its page on our site; a small "Powered by Running Events Near Me" link at the bottom.
- Only shows races that already pass the public checks (confirmed future dates, trusted links). No prices, no scraped organiser claims.
- A "Get the code" button on each club page, each organiser area and the For Clubs / For Organisers pages: pick a style (light/dark), copy one line of code.
- Fits the outreach note: "your race is listed — here's a free box to show all your fixtures on your site."

## 2. Make existing pages more shareable and findable
- Each race page gets a "Share this race" button (WhatsApp, Facebook, copy link) with tracked links so we can see social visits in Plausible.
- Each club page gets a "This club's races" list plus the embed button.
- Month pages and region pages link to the most relevant neighbouring months/distances so Bing visitors keep browsing.

## 3. Measure it
- Plausible events: "Embed Code Copied", "Embed View" (per site), "Share Click".
- Embed links tagged with utm_source=embed so referral visits show separately.
- Review after 6 weeks: how many sites installed it, visits from them, onward race clicks (hand-offs only, not entries).

## Not doing now
- Pace calculator or generic tools (crowded, wrong audience).
- New bulk search pages (blocked until the Explorer is proven).
- Automated outreach or emails.

## Technical details
- Public server route `src/routes/api/public/embed/$kind.$slug.ts` returning a small cached HTML page (iframe) plus a lightweight `/embed.js` loader; reads via `events_public_v1` and `DISCOVERY_EVENT_COLUMNS`, filtered by `hasOrganiserOwnedLink` and confirmed-future G3/G4 eligibility; no `source`/`source_url`.
- Club/organiser scope uses accepted verified relationships only (same resolver as monthly host-club links); radius uses the existing postcode/bounding-box helper.
- Rate limited, Cache-Control ~1h, `noindex` on the iframe document, links `target=_blank` with UTM.
- Share buttons are client-only; no new tables needed. Pure tests for the embed eligibility filter and UTM builder.
- Record the embed rule in AGENTS.md.
