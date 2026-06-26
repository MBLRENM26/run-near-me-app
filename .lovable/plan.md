## Goal

Stop submitting sitemap URLs we already noindex. Aligning the sitemap with `computeIndexability()` should drop the "Discovered – currently not indexed" bucket significantly and concentrate Google's crawl budget on pages we actually want ranked.

## What's wrong today

`src/routes/sitemap[.]xml.tsx` lists every ACTIVE event with a future `sort_date`. The per-page indexability rule (`src/lib/event-indexability.ts`) then noindexes a large slice of those for being:

- slug-suffix duplicates (`-race-N`, `-{month}`, dated suffixes)
- orphans (no entry URL, no organiser URL, no organiser)
- duplicate siblings (series instances that aren't the earliest upcoming)

Result: we ask Google to crawl ~hundreds of URLs that emit `noindex, follow`. That's the primary driver of the GSC report.

## Fix

Make sitemap inclusion match indexability.

1. Add a new server fn `getIndexableEventSlugsForSitemap()` in `src/lib/events.functions.ts` that:
   - Fetches all ACTIVE events with `sort_date >= today OR sort_date IS NULL`, columns: `id, slug, name, sort_date, entry_url, organiser_url, organiser`.
   - Builds a `Map<normalisedName, SiblingEvent[]>` using `normaliseEventName()`.
   - For each event, calls `computeIndexability(event, siblings, today)` and keeps only `result.indexable === true`.
   - Returns `{ slug, sort_date }[]` (same shape callers expect).

2. Update `src/routes/sitemap[.]xml.tsx` to call the new fn instead of `getAllActiveSlugs`. Drop the now-redundant past-event filter (the new fn already enforces it via the date predicate + indexability `past` check).

3. Leave per-page noindex logic untouched — pages stay live for direct visitors, we just stop asking Google to crawl them.

## Verification

- Locally curl `/sitemap.xml` and confirm event count drops materially (expect a 20–40% reduction based on the noindex categories).
- Spot-check a few that should now be gone: `3k-on-the-green-2026-07-31`, anything with `-race-N` suffix, any event with no organiser + no links.
- Spot-check a few that should still be present: standalone events, the *earliest upcoming* sibling of a series.
- After deploy: resubmit sitemap in GSC. Allow 1–4 weeks for the "Discovered – currently not indexed" count to drop as Google re-evaluates.

## Out of scope

- Forcing Google to crawl faster (not possible).
- Changing the indexability rules themselves — they're working as designed; the sitemap just wasn't honouring them.
- Anything about discovery-surface link-trust filtering — separate concern, already correctly applied on listing pages.