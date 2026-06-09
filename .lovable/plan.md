# Fix Search Console Errors First, Then Scotland Athletics

## What I found

### GSC errors — root causes identified

**1. "Missing field 'location'" — 1,607 event pages affected**
The event page JSON-LD only includes `location` when the event has a town or county. 1,607 active events have neither — but **all 1,607 have a region** (and 1,429 have coordinates). Easy fix.

**2. Probable "Missing field 'startDate'" too — 1,397 events**
1,397 active events have no date at all. Google requires `startDate` on Event schema, so these pages emit invalid structured data.

**3. "Soft 404"**
Hard 404s work correctly (verified live — missing events return a real 404 status). The likely soft-404 candidates are the **1,970 active events whose date has already passed** — they're still in the sitemap and render with stale past dates, plus any listing pages that render with zero events. I'll pull the exact affected URLs from Search Console to confirm before changing anything.

**4. "Excluded by noindex"**
This one is mostly **intentional and healthy**: thin region×distance pages (<3 events) and admin pages are deliberately noindexed, and the sitemap already excludes them. No fix needed — but I'll verify against the actual URL list from GSC.

### Scotland Athletics
Their events calendar page loads events via JavaScript — the static HTML contains no event data or obvious API endpoint. Needs a browser-based inspection to find the underlying data feed.

## Plan

### Phase 1 — GSC fixes (do first)

1. **Pull exact affected URLs from Search Console** via the connected GSC API, so fixes target the real problem pages rather than guesses.
2. **JSON-LD location fallback**: when town/county are missing, fall back to `region` (e.g. Place name "Scotland", addressCountry GB). Fixes all 1,607 "missing location" errors.
3. **Undated events**: omit the Event JSON-LD block entirely when there's no date (invalid schema is worse than none), keeping the page itself indexable.
4. **Past events**: exclude events with a past date from the sitemap (keep the pages live so existing links still work). If GSC confirms these are the soft-404 source, optionally add `eventStatus` handling or noindex events more than ~30 days past.
5. **Verify noindex exclusions** against the GSC URL list — expected to be intentional thin/admin pages; no code change unless something unexpected shows up.

### Phase 2 — Scotland Athletics source investigation

6. Use the browser tool to load their events calendar and capture the network request that fetches event data (likely a WordPress AJAX/JSON feed).
7. Assess the feed: fields available (name, date, location, distance, entry URL), volume, and licensing/attribution considerations.
8. If viable, map their fields to our import format and load via the existing `/api/public/import-events` endpoint (which now auto-normalises regions). If their feed is unusable, fall back to alternative Scottish sources (e.g. SI Entries / Entry Central, which carry most Scottish races).

## Technical details

- Location fallback edit: `src/routes/events.$slug.tsx` head() JSON-LD block (~lines 76–87).
- Sitemap edit: `src/lib/events.functions.ts` `getAllActiveSlugs` — filter `sort_date >= today OR sort_date IS NULL` (undated events stay in, since many are "month TBC" future races... actually undated ≠ past; only filter confirmed-past dates).
- GSC API calls go through the connector gateway (read-only queries first).
- No database changes required for Phase 1.
