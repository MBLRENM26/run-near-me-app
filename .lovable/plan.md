## Fixes

**Fix 1 — Remove duplicate "Listing added" footer**
`src/routes/events.$slug.tsx` lines 968–972: delete the `{listingAdded && (…)}` block at the end of the page. The trust strip below the CTA card (line 653) already shows `Listed {listingAdded} · Source: {…}`, so the footer line is a duplicate.

Keep `formatListingAdded` and the `listingAdded` variable — both are still used by the trust strip and by `listingPublishedISO` in the JSON-LD.

**Fix 2 — Suppress "Organised by" for null/empty/TBC**
`src/routes/events.$slug.tsx` line 603: tighten the guard from `{e.organiser && (…)}` to also reject empty strings and the literal `TBC` (case-insensitive). Add a small helper or inline check:

```ts
const organiserName = e.organiser?.trim() ?? "";
const showOrganiser = organiserName.length > 0 && organiserName.toLowerCase() !== "tbc";
```

Then render `{showOrganiser && (…)}` and use `organiserName` (not `e.organiser`) inside the block.

No data-layer change. `matchingClub` lookup in `events.functions.ts` already does a non-null check on `e.organiser`, and "TBC" will never match a real `public_clubs` row so the existing match logic is harmless — but for cleanliness I'll add the same `trim()` + `tbc` guard around the club-lookup block in `getEventPageData` so we don't waste a DB roundtrip on TBC-only rows.

## Clarification — Fix 3

`sameWeekendNearby` **is** implemented exactly as specced. In `src/lib/events.functions.ts` lines 912–957:

- `.eq("county", event.county)` — county-filtered
- `.gte/.lte("sort_date", …)` against `event.sort_date ± 2 days` — ±2 day window
- `.neq("id", event.id)` — excludes self
- `hasOrganiserOwnedLink(…)` gate per row
- Returns up to 6; UI hides when `< 3` (events.$slug.tsx line 879)
- Silent omission when `event.county` is null — TRA / Scottish events skip the query entirely (line 915 guard)

The "More {discipline} in {region}" block you're also seeing is a separate, pre-existing section (`showCombo`, lines 446–453 / rendered further down) — it's the region × distance link, not the new same-weekend feature. Both are live; they're complementary, not substitutes.

No code change needed for Fix 3 — it's a confirmation only. Approving this plan will execute Fixes 1 and 2.
