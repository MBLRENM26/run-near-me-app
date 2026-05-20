# Persist month filter across distance navigation

## Problem

On a region × distance page (e.g. `/running-events/south-west/10k-races?month=2026-12`), clicking another distance pill in `DistanceNav` navigates to the new combo page but drops `?month=2026-12`. The user then has to re-pick December. Same issue on region pages and top-level distance pages — any time `DistanceNav` is used while a month filter is active, the filter is lost on click.

Expected behaviour: if the user has narrowed by month, switching distance should keep that month. If the new (region × distance) combo has no events in that month, the existing empty state already prompts "Show all months", so there's a safe escape hatch.

## Fix

Make every `<Link>` in `src/components/distance/DistanceNav.tsx` forward the current `month` search param to its destination.

TanStack's `<Link search={(prev) => ...}>` function form preserves existing search params and is type-safe per destination. Since the destination routes (`/5k-races`, `/10k-races`, …, `/running-events/$slug/$distance`) all already register `monthSearchValidator`, the param is valid on the receiving end.

### Change

In `DistanceNav.tsx`, for both the `regionSlug` branch and each of the six top-level distance `<Link>`s, add:

```tsx
search={(prev: { month?: string }) => ({ month: prev?.month })}
```

That's the only code change. No new files, no route changes, no SEO impact (canonical and metadata stay unfiltered as already implemented).

### Out of scope

- The parkrun region link below the distance nav (different route family, no month filter there).
- The homepage "Back to all events" link — intentional reset.
- Region selector elsewhere on the page (regions don't share month context — switching region is a bigger context switch).

## Verification

1. Visit `/running-events/south-west/10k-races?month=2026-12`, click **5K** pill → URL becomes `/running-events/south-west/5k-races?month=2026-12`, list is filtered to December.
2. From the same page, click **Half marathon** → month persists; if no December half marathons in South West, empty state offers "Show all months".
3. From `/10k-races?month=2026-12`, click **5K** pill → `/5k-races?month=2026-12` with December filter applied.
4. Region page `/running-events/south-west?month=2026-12`, click any distance pill → month persists.
