# Remove aggregator attribution text from event pages

## Why
Naming the scrape source ("Originally listed on runabc.co.uk" / "Listed via englandathletics.org") isn't legally required for factual event data, gives free exposure to other sites, and makes listings feel second-hand. Trust should come from accurate data and official organiser links instead.

## Changes
1. **Event detail page (`src/routes/events.$slug.tsx`)**
   - Remove the "Originally listed on {host}" caption under the CTA button.
   - Remove the "Listed via {host}" info line shown when there's no official link — those pages just show the event details plus the existing "Are you the organiser? Claim this listing" block, which does the trust-building job properly.
2. **Sweep for other attribution spots** — check `EventCard` and any listing components for similar "listed on/via" text and remove it the same way.
3. **Update project memory** (`mem://constraints/scraped-data-trust`) — aggregators are now never named at all, not even as plain text.

## What stays
- `source_url` stays in the database for internal enrichment/debugging — it just never renders.
- The link-trust classifier is unchanged: official entry links and organiser sites still render exactly as now.

## Verification
- Re-check Full Essex Way Ultra (no "Listed via" line, claim block present) and a page with an official link (no "Originally listed on" caption).