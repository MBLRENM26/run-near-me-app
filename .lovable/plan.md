# Improve "Discover events across the UK" quality

## Goal
Surface 6–8 races on the homepage with strong, complete data, dated 1–3 months out across the UK. No new infra, no scoring system, no DB changes.

## Where
`src/routes/index.tsx` — the `upcomingEvents` `useQuery` (the only consumer of this list). Pure frontend change to the Supabase query + a light post-filter.

## Query changes
Replace the current `events` select with one that already filters out the obvious low-quality rows:

- `status = 'ACTIVE'` (unchanged)
- `date_is_estimated = false` — exclude month-only / TBC dates
- `sort_date` between **today + 30 days** and **today + 120 days** — the "1, 2, 3 months out" window (slight buffer either side so the list never empties)
- `lat not null` AND `lng not null` — must be mappable / locatable
- `town not null` AND `county not null` — must have a real location label
- `distances not null` AND `distances <> ''` — must declare a distance
- Exclude parkruns (`not.ilike.%parkrun%` on `name`) so the dedicated parkrun section owns them
- Order: `is_featured desc`, then `sort_date asc`
- `limit(20)` to give the post-filter room

## Post-filter (in the component, tiny)
From the 20 rows, keep only those that ALSO have at least one trusted link (`entry_url` or `organiser_url` classifies as `entry` or `organiser-site` via existing `classifyEventLink` in `src/lib/link-trust.ts`). Then `.slice(0, 8)`.

Render heading stays "Discover events across the UK"; if fewer than 6 survive (very unlikely given the buffer), still render what we have — the section already hides when the list is empty.

## What this excludes
Month-only dates, missing town/county, missing distances, no coordinates, no trusted entry/organiser link, parkruns, anything sooner than ~30 days or further than ~120 days.

## Out of scope
- No DB columns, RPCs, or migrations
- No changes to the nearby-events list, featured-nearby, region/distance pages
- No new "quality score" — just hard filters on fields we already have
- Copy unchanged

## Verification
Load `/` signed out with no location set → "Discover events across the UK" shows 6–8 races, all with a real day-precision date 1–3 months out, a town + county, a distance, and an Enter/Organiser CTA on the card.
