# Monthly race lists: making them the site's front door

## Where we start

Six monthly list types already exist: all running events, 5K, 10K, half marathon, marathon and ultra, each with a page per month (for example "Marathons in October 2026"). Today each one shows a heading, a single count line ("12 UK marathons in October 2026") and a grid of race cards. That's all. Every aggregator's month page looks the same, which is why Google has no reason to prefer ours.

## The idea in one line

Make every month page a quick **planning tool** built only from facts we hold: when the races fall, where they are, what type they are, how certain each date is, and when we last checked. No written filler and no new page types.

## What a month page will look like

```text
Half Marathons in March 2027
38 UK half marathons · 31 dates confirmed · 7 dates still to be confirmed
Last checked: 18 Oct 2026

[ Sat 6 | Sun 7 ]  [ Sat 13 | Sun 14 ]  [ Sat 20 | Sun 21 ] ...   <- weekend strip, counts per day
By region:  South East 9 · North West 6 · Scotland 4 · ...           <- tap to filter
Type:       Road 30 · Trail 6 · Multi-terrain 2
Licensed:   24 of 38 show a race licence

Race cards, grouped by weekend ("Weekend of 13–14 March: 11 races")
  - each card can show small badges: Course map · Date confirmed · Entries open (verified only)

Also this month:  5K · 10K · Marathon · Ultra (with counts)
Neighbouring months:  ← Feb 2027 (22)   Apr 2027 (41) →
```

All of this comes from real fields and live counts, and the same layout works for every distance and month.

## What we'll add that other sites won't have (and why it isn't gaming Google)

Google rewards pages that answer the searcher's real question better than the alternatives. Someone searching "half marathons March 2027" is planning, so they want to know which weekends are busy, what's near them and which races are confirmed.

1. **Weekend strip and weekend grouping.** Entry sites list races one by one. We show how the month is spread out, which nobody else does.
2. **Honest certainty.** We say "31 confirmed, 7 to be confirmed" and label each race. Other sites hide uncertainty. Showing it builds trust and matches your "unknown beats wrong" rule.
3. **Region and type breakdown.** These are real counts, and tapping one filters the list on the same page. They don't create new pages.
4. **Course map badge** where a cleared course map exists (from the research agent's 278 maps, once staged). Entry sites rarely link these.
5. **"Last checked" date** taken from our import and check records, so the page visibly stays current.
6. **Clean links between related pages**: other distances in the same month, plus the previous and next month.

Guardrails that keep it honest:
- No written paragraphs or invented descriptions. Every sentence is a count or a stored fact.
- No new page types or extra URLs. Filters stay on the same page.
- Months with very few races (under 3) are kept out of Google and the sitemap, so we never publish thin pages.
- Each page points to itself as the main version. No keyword stuffing in titles. The title stays "Half Marathons in March 2027 — 38 UK races".
- Past months stop showing up in Google, as they do today. They'll point visitors to the same month next year.

## Building for the future first

The main step is building one shared **month summary** (counts by day, region, type, certainty, licence, course map, last checked) that every month page reads from. It can later power:
- the Explorer, which can show the same summary for any search area
- region and county pages ("Races in Kent by month") without new code
- the weekly social posts and email digest in your later distribution step (PX4)
- the MCP tool, so AI assistants can answer "what's on in March near me"
- Bing IndexNow pings, which only fire when a month's summary actually changes

Because the summary is built once and reused, every later step costs less.

## Size of the job

Three separately approved packages, each with tests and its own sign-off:

| Package | What | Rough size |
|---|---|---|
| A. Month summary foundation | Shared calculations and tests. No visible change. | About 1 session |
| B. New month page layout | Summary bar, weekend strip, filters, badges, related links, under-3 rule | 1–2 sessions |
| C. Optional follow-ons | Reuse on region pages, the Explorer and the MCP. IndexNow on change. | Later, each on its own |

The course map badge only appears once the course map batch from the agent data is reviewed. Until then the page simply doesn't show it.

Expect a few days of work for A and B. Results in Bing come within weeks. In Google, results take months.

## Technical details

- New pure module `src/lib/month-summary.ts`: takes the existing `DistanceEvent[]` from `getEventsForMonth` and returns `{ total, confirmed, estimated, byDay, byWeekend, byRegion, byTerrain, licensedCount, courseMapCount, lastCheckedAt }`. Vitest unit tests cover counts, weekend grouping, estimated dates (month-only dates are excluded from day counts and listed under "date TBC") and the under-3 threshold.
- `src/lib/month-page.functions.ts`: extend the existing server function to return the summary, sibling-distance counts (reusing the existing 12-month count query at line ~140), prev/next month counts and the latest successful `sync_runs` timestamp. It keeps `DISCOVERY_EVENT_COLUMNS`, `hasDiscoverableLink` and `UK_BOUNDS_OR_NULL`, and never selects source columns.
- `src/components/month/MonthPage.tsx`: add the summary bar, weekend strip, region/type chips (client-side filtering through validated search params, canonical without params), weekend-grouped grid, and related-links block. Uses semantic design tokens only.
- `buildMonthHead`: when `total < 3`, add `robots noindex,follow` and exclude from `sitemap[.]xml.tsx`. Keep the self canonical and add `numberOfItems` to the ItemList JSON-LD. Badges show only verified states (entries-open per the link doctrine).
- Course map badge reads `event_course_sources` and only counts cleared rows. It's hidden when there are none.
- Out of scope: new route families, written prose, schema changes, changes to event pages.
