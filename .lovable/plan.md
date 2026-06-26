# Plan: Homepage filter fix + DRY pass

Two tightly-scoped changes. No behaviour change anywhere except item 1.

## 1. Fix homepage geo-radius results (HIGH severity bug)

**Problem:** When a user enters a location, results from the `events_within_radius` RPC are rendered without the `hasOrganiserOwnedLink` gate. Events whose only link is on sientries / justgo / sport80 / etc. appear here even though they're suppressed on every other discovery surface.

**Fix:** In `src/routes/index.tsx`, filter `eventsWithDistance` through `hasOrganiserOwnedLink` before it feeds into `visibleEvents` / `races` / `parkruns` / `featuredNearby`. One filter, applied once at the source.

```ts
const eventsWithDistance = useMemo(() => {
  if (!nearbyEvents) return [];
  return nearbyEvents
    .filter((e) => hasOrganiserOwnedLink(e.entry_url, e.organiser_url))
    .map((e) => ({ ...mapping... }));
}, [nearbyEvents]);
```

This means `featuredNearby` no longer needs its own redundant filter call — remove it.

## 2. DRY pass — three small extractions, no behaviour change

### 2a. UK bounding-box filter → named constant
Currently the string `"lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)"` is repeated 4× in `events.functions.ts` (lines 195, 307, 425, 610).

Extract to top of file:
```ts
const UK_BOUNDS_OR_NULL =
  "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)";
```
Replace all 4 call sites with `.or(UK_BOUNDS_OR_NULL)`.

### 2b. Discovery event column list → shared constant
Currently 4 diverging variants of the events SELECT column list:
- `events.functions.ts:190` (full)
- `events.functions.ts:302` (full, identical to 190)
- `running-events.$slug.tsx:121` (missing region, distance_tags, terrain_tags, is_recurring)
- `index.tsx:184` (missing sort_date)

**Decision:** Define a single canonical list for discovery surfaces in `src/lib/events-columns.ts`:
```ts
export const DISCOVERY_EVENT_COLUMNS =
  "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, is_featured, date_is_estimated, is_recurring";
```
Use it at all 4 sites. The two client-side routes will start selecting a few extra columns they currently don't (region, distance_tags, terrain_tags, is_recurring, sort_date) — this is harmless (small payload increase, no PII), and the mem note about "canonical public column list" is preserved: we're keeping it narrow, just centralised. Confirms the "never leak source / source_url" rule is enforced in one place.

### 2c. Paginated fetch loop → helper
The "fetch in 1000-row pages until you have N or run out" pattern is repeated 5× in `events.functions.ts` (lines 186, 298, 416, 600, plus inline in getEventPageData). Extract to a private helper in the same file:

```ts
async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PostgrestFilterBuilder<...>,
  pageSize = 1000,
): Promise<T[]> { ... }
```

Keep it file-private for now (not exported) — if a second file ever needs it we promote it then. Avoids over-engineering.

## Out of scope (deferred, per your call)

- Region page → SSR loader pattern (item 4 in audit)
- Splitting `events.functions.ts` into discovery vs detail files (item 5)
- `events.$slug.tsx` size (item 7)
- `.lovable/plan.md` staleness (item 8) — will refresh as part of this PR's plan doc

## Verification

1. `bun run tsgo` — clean.
2. Homepage with location set: confirm Holme Moss Fell Race (sientries-only) no longer appears in the nearby grid (it should still appear on its own event page).
3. Spot-check `/trail-running-events`, `/running-events/yorkshire`, and `/running-events/yorkshire/marathons` — counts unchanged (these already used the gate).
4. Grep confirms only 1 occurrence of the bounds string and 1 of the column list across `src/`.

## Files touched

- `src/routes/index.tsx` — add filter at source, remove redundant filter from `featuredNearby`, use shared column constant
- `src/lib/events.functions.ts` — extract bounds constant + paginated fetch helper, use shared column constant
- `src/routes/running-events.$slug.tsx` — use shared column constant
- `src/lib/events-columns.ts` — NEW, single constant
- `.lovable/plan.md` — replace stale link-trust plan with this one
