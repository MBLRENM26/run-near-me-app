# Month Filtering — Implementation Plan

## Approach

Query-param month filtering on the three existing page types. No new routes, no sitemap changes, no SEO surface added. Filtered views set their canonical to the unfiltered URL so they never compete with the indexable page.

Defer programmatic month-routes (Option B) until GSC data proves specific combos deserve their own pages.

## Scope

Add `?month=YYYY-MM` to:

- `/{distance}-races` and friends — `src/routes/5k-races.tsx`, `10k-races.tsx`, `half-marathons.tsx`, `marathons.tsx`, `trail-running-events.tsx`, `ultra-marathons.tsx`
- `/running-events/{region}` — `src/routes/running-events.$slug.tsx`
- `/running-events/{region}/{distance}` — `src/routes/running-events.$slug_.$distance.tsx`

Out of scope:
- Homepage (already has its own location-based flow)
- Parkrun pages (weekly events, month makes no sense)
- New static month routes
- Sitemap changes

## Pieces to build

### 1. Shared helpers — `src/lib/distance-filters.ts`

```ts
export type MonthKey = `${number}-${string}`; // "2026-11"

export function eventMonthKey(e: { sort_date?: string | null }): MonthKey | null;
export function filterByMonth<T>(events: T[], month: MonthKey | undefined): T[];
export function availableMonths(events: { sort_date?: string | null }[]): MonthKey[]; // sorted, deduped, only months ≥ today, capped at next 12
export function formatMonthLabel(m: MonthKey): string; // "Nov 2026"
```

### 2. New component — `src/components/events/MonthFilter.tsx`

Pill row, same styling as `FilterBar`. Props:
```ts
{ months: MonthKey[]; value?: MonthKey; onChange: (m: MonthKey | undefined) => void }
```
First pill = "All months" (clears filter). Component renders nothing if `months.length < 2` (no point filtering one month).

### 3. Search-param hook — `src/lib/use-month-search.ts`

Tiny wrapper to keep the three route files DRY:
```ts
type MonthSearch = { month?: MonthKey };
export const monthSearchValidator = (raw): MonthSearch => { /* YYYY-MM regex check */ };
```

Each route adds:
```ts
validateSearch: monthSearchValidator,
```
and the component uses `Route.useSearch()` + `useNavigate()` to read/write `month` — same pattern as the homepage refactor.

### 4. Wire into the three page components

- `DistancePage.tsx`, `RegionPage` (already inside `running-events.$slug.tsx`), `RegionDistancePage.tsx`:
  - Compute `availableMonths(events)` from the loader data
  - Render `<MonthFilter>` above the event grid
  - Apply `filterByMonth(events, month)` before rendering
  - Empty state: "No {distance} in {region} in {Month Year} yet — show all months"

### 5. SEO — canonical stays unfiltered

In each route's `head()`, the canonical `<link>` is always the bare path. No change needed to existing head builders other than confirming they don't echo search params (they don't).

Do NOT mutate `<title>` or `<h1>` based on the month filter — would fragment SERP snippets and create thin duplicate signals.

Optionally render a small "Showing events in November 2026 · clear" sub-heading when filtered, purely visual.

### 6. Internal linking — none for now

Don't add month links into the page bodies. Keeps crawl surface clean. If we promote specific month combos to static routes later (the hybrid), that's when internal links get added.

## Technical details

- `MonthKey` derived from `sort_date` in UTC (matches existing `formatEventDate` convention in `src/lib/date.ts`).
- `availableMonths` filters out months strictly before the current month, sorts ascending, caps at 12.
- Month pill click → `navigate({ search: prev => ({ ...prev, month: next }) })`. Same-pill click clears: `({ ...prev, month: undefined })`.
- Combine cleanly with existing search params on combo pages (none today, but future-proof via spread).
- All filtering is client-side on already-loaded events — no new DB queries, no loader changes.

## Build effort

~Half a day. Largest piece is wiring the eight route files; the helper + component are ~60 LOC each.

## What we'll learn before considering Option B

After 6–8 weeks live:
1. Check GSC for queries containing month names landing on region/combo pages.
2. Identify top 10–20 (region × distance × month) combos by impressions.
3. *Then* decide whether to generate static routes for those specific combos with a 12-month rolling sitemap. Everything else stays on query params.
