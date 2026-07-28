## What the export actually says

The file is a **"Crawled – currently not indexed"** validation, not a new failure:

- 50 URLs sampled: **48 Pending**, **2 Failed**.
- Pending is normal — Google re-crawls in batches and this validation is still running.
- The two Failed URLs are the useful signal: `/10k-races/september-2026` and `/parkrun-events/crosby`. Google re-crawled both on 2026-07-18 and still declined to index.

I checked both live. One is a real bug; the other is a content/data problem.

## Finding 1 (bug, high impact): every distance × month page renders the hub page

`src/routes/10k-races.tsx` is a parent of `src/routes/10k-races.$month.tsx` under flat routing, and it has no `<Outlet />`. Verified live:

- `/10k-races/september-2026` and `/10k-races` render the **identical** H1 and body (`10K Races in the UK 2026`, ~10,800 words).
- The month page emits **two** canonical tags — the parent's `.../10k-races` first, then the child's `.../10k-races/september-2026`.

So Google sees a byte-near-duplicate of the hub with a canonical pointing away from itself. "Crawled – currently not indexed" is the expected outcome. The same pattern applies to all five pairs: `5k-races`, `10k-races`, `half-marathons`, `marathons`, `ultra-marathons` — and the sitemap actively submits these URLs.

**Fix:** rename each child to escape nesting, matching the existing `running-events.$slug_.$distance.tsx` convention:

```text
10k-races.$month.tsx      -> 10k-races_.$month.tsx
5k-races.$month.tsx       -> 5k-races_.$month.tsx
half-marathons.$month.tsx -> half-marathons_.$month.tsx
marathons.$month.tsx      -> marathons_.$month.tsx
ultra-marathons.$month.tsx-> ultra-marathons_.$month.tsx
```

URLs are unchanged. After the rename each month route renders `MonthPage` on its own with a single self-referencing canonical. Verify by curling one page and confirming exactly one `<link rel="canonical">` and a month-specific H1.

## Finding 2 (content/data): parkrun detail pages are thin, and some are mis-regioned

`/parkrun-events/crosby` server-renders correctly but carries roughly 120 words of unique body text — name, distance, day/time, five nearby links, one outbound link. There is also a data error: Crosby parkrun sits at 53.48 / -3.05 (Merseyside) but the page, its breadcrumb, and its schema all say **Wales**.

Proposed, in order:
1. Audit region assignment for parkrun locations against latitude/longitude using the existing region-from-coords helper, and report how many rows disagree with their stored region before changing anything.
2. Correct the mismatched rows.
3. Add non-invented, structured depth to the parkrun template: nearest town/county, distance-to-nearest-city, a "races near this parkrun" block drawn from live event rows in the same county, and the region breadcrumb. No generated prose — stable structured fields and live counts only, per the project rule.

## Finding 3 (low priority): legacy URLs still in the validation set

`/browse`, `/submit`, `/event/big-half`, `/event/north-downs-30k`, `/event/vitality-london-10k`, `/north-downs-30k` all correctly return 404 now. They were last crawled Feb–Mar and will drop out on their own. The `?claim=` variants correctly emit `noindex, follow` plus a canonical to `/list-your-event` — also fine, and no action needed.

## Sequencing

1. Route rename (finding 1) — small, self-contained, unblocks ~60 submitted URLs.
2. Read-only parkrun region audit, report the number before any write.
3. Parkrun template depth, once the region data is trustworthy.
4. Re-run GSC validation only after step 1 ships and is published.

## Technical notes

- Flat-route trailing `_` escapes parent nesting in TanStack Router; `src/routeTree.gen.ts` regenerates automatically and must not be hand-edited.
- No sitemap change is needed — the URLs it emits are already correct; they just render the wrong component today.
- No change to `src/lib/event-indexability.ts` or the `X-Status-Override` interceptor is implied by this work.
