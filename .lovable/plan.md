# Clearer month links on race pages

## Where things stand
Race pages already link to their month page, but only by turning the race date into a link (plus a small "half marathons in March" link beside it). It's easy to miss, for people and for Google.

## What to build
1. **A "More races in [Month Year]" block** near the bottom of each upcoming race page, above the contact line.
   - One main link: "All races in March 2027 (42)".
   - One distance link where a month page exists: "Half marathons in March 2027 (9)".
   - Counts are real, from the same month counting the month pages use.
2. **Only link to month pages Google is allowed to show** (3 or more races). Thin months get no block, so we don't push Google to weak pages.
3. **Past races get no block** (same as today), so old pages don't compete.
4. Keep the existing date link as it is.

## Measure
Add to the 31 Oct / 7 Nov check-in: Google and Bing views and clicks for month pages.

## Technical details
- Extend `src/lib/event-internal-links.ts` to return counts and an indexable flag, using `src/lib/month-summary.ts` and `isIndexableMonth`.
- Fetch the counts in the event page loader (public columns only).
- New small section component; semantic tokens only.
- Tests: no link when the month has under 3 races; no link for past races; distance link only for distances with a month page.
