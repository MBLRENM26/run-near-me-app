## What's actually happening

Confirmed by querying the database directly: there are no trail/fell/multi-terrain events in the South East with a June 2026 date. The earliest trail event in the region is **Rasselbock 545 — 1 July 2026**. So the empty result on `/running-events/south-east/trail-running-events?month=2026-06` is not a missing-data bug in the query — the data really isn't there.

The reason you saw an empty June page is a **UX issue in `DistanceNav`**: when you switch distance (e.g. South East → Trail), the component forwards the currently-selected `month` search param to the destination URL. You had June selected on the all-distances South East page; clicking "Trail" carried `?month=2026-06` over to the trail page, where June isn't one of the months that has any trail events. Result: the destination shows a "no events in June" empty state with a working "Show all months" button.

## Recommendation — strategic, not a quick fix

Distance and month are **independent dimensions of intent**. Persisting a month across a distance change is the wrong default for three reasons that matter long-term:

1. **It produces false empties** that look like missing data (exactly what just happened) and that we cannot avoid as the catalogue grows — every region × distance × month cell will not have entries.
2. **It muddies analytics.** Right now `trackFilter` fires when a user actively picks a month. Auto-carrying it makes "month=June" look like an explicit choice on every onward navigation, polluting which months are actually in demand.
3. **It blocks the town-page work coming next.** Town pages, region pages, and region × distance pages will share the same `month` search param convention. The cleanest rule across all of them is: month is scoped to the page you set it on; switching scope (region, distance, town) resets it. Anything else creates inconsistent state to reason about as we add more page types.

The fix is one line in `DistanceNav` — stop forwarding `month` in the `search` prop on its `<Link>`s. The `MonthFilter` on the destination page already only shows months that have data, so users land on a clean "all months" view and can re-filter if they want.

## Scope of change

Single file: `src/components/distance/DistanceNav.tsx`.

- Remove the `const search = (prev) => ({ month: prev?.month })` line.
- Remove the `search={search}` prop from every `<Link>` in `PillLink` (both the region-combo link and the six top-level distance links).

No changes to:
- `MonthFilter` (already correctly only renders months present in the dataset)
- `RegionDistancePage` empty state (already correctly offers "Show all months")
- Loaders / query functions / data model
- Any other persistence (distance pill itself, region context — those come from the URL path, not search params, and are unaffected)

## Out of scope

- Slice 2 (Add new event) and Slice 3 (CSV import) — unchanged, still queued next.
- Any change to how the `MonthFilter` itself behaves within a single page (still persists when re-rendering the same page, still tracked via `trackFilter`).
- Backfilling South East trail events for June. There genuinely are no June trail races scraped yet for that region; that's a data-sourcing question, not a UI fix.

## Verification

After the change, from `/running-events/south-east?month=2026-06`, clicking the Trail pill should land on `/running-events/south-east/trail-running-events` (no `?month=`) and show all upcoming South East trail events starting July 2026. Same pattern verified for top-level distance pills (e.g. selecting June on `/running-events/south-east` then clicking 5K should go to `/5k-races` clean).
