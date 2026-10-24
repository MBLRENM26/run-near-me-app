# Make race listings worth clicking in Google

## Why people aren't clicking (checked)
- People search for the race by name, e.g. "great bentley half marathon 2027" (439 views, position 9) or "petts wood 10k 2026" (374 views, position 8). They want the official site, and Google lists it first. We're at the bottom of page 1.
- The words Google shows for us say nothing the official site doesn't: "…is a Half Marathon race in Great Bentley… Follow the race links for entry information." That reads like a middleman.
- Where our page wins (Gight Eight 28%, Cape Town 13%), we rank in the top 4, or the official site is weak.

## What to change
1. **Titles with something useful in them.** Use the race name, date, and one checked fact or the town, for example "Great Bentley Half Marathon 2027 – Sun 7 Feb, flat road, 09:30 start". Use a checked fact only when one exists. Never invent one.
2. **Descriptions that answer a question.** Pick from checked facts (start, surface, climb, buggies, parking) and nearby races the same month. Drop "Follow the race links…".
3. **Race details for Google in its own format.** Send start time, venue and distance as event data, so the listing can show the date and place.
4. **Measure it.** Note today's figures for the top 10 pages by views, then compare at the ~31 Oct check-in and two weeks later.

## Not doing
- Clickbait, prices or anything not checked.
- Hiding that the official site exists.

## Technical details
- Change `head()` in `src/routes/events.$slug.tsx`. Build the title and description with a pure helper (`src/lib/event-snippet.ts`) that takes structured fields and `raceFacts`, with tests covering the length limits and the "no fact → no claim" rule.
- Extend the existing Event JSON-LD with `startDate` (including time when known), `location` and `eventStatus`. Use only checked fields.
