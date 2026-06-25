
## Sprint A.5 — clear the 323 soft 404s

All 323 are `/events/{slug}` pages. 271 (84%) are ACTIVE future events in duplicate-series clusters; 46 are ACTIVE past. The fix is targeted `noindex, follow` + dropping stale Event JSON-LD, with one indexed instance per series preserved so brand queries still land somewhere.

## What changes

### 1. Per-event indexability rule (new)

A new pure helper `src/lib/event-indexability.ts` returns `{ indexable: boolean, reason?: string }` for an event. An event is **noindex** if **any** of:

- **Past** — `eventProximity(e) === 'past'`.
- **Slug-suffix duplicate** — slug matches `-race-\d+$` or ends with a month name (`-january` … `-december`).
- **Orphan** — no `entry_url`, no `organiser_url`, no `description`.
- **Name-collision sibling** — there are ≥2 ACTIVE events sharing the normalised name AND this event is **not** the earliest upcoming instance in that group.

Indexable cases:
- Future event, unique normalised name, has at least one official link or description.
- The earliest upcoming instance of any name-collision group (Race for Life Liverpool's next date stays indexed; the 20 later cities/dates noindex).

### 2. `events.$slug.tsx` — wire up the rule

In `head()`, when `indexable === false`:
- Add `{ name: "robots", content: "noindex, follow" }`.
- Drop the Event JSON-LD entirely (keep BreadcrumbList).

Page UI does not change — direct visitors still see the event.

### 3. Loader: surface the data needed to decide

Extend `getEventBySlug` (or add a sibling fn `getEventBySlugWithIndexability`) in `src/lib/events.functions.ts` to also return:
- `name_sibling_earliest_slug` — slug of the earliest upcoming ACTIVE event sharing the normalised name, or `null` if this event is unique.

Normalisation: lowercase, trim, collapse whitespace, strip trailing year/month suffix from the name (not the slug). Examples that should collide:
- "Race for Life — Liverpool", "Race for Life - Manchester" → both normalise to "race for life".
- "Pretty Muddy Glasgow", "Pretty Muddy Edinburgh" → "pretty muddy".
- "Trunce Series Race 5/6/7/8" → "trunce series race" (number stripped).
- "Tatton Park 5K & 10K — July" / "— August" → "tatton park 5k & 10k".

`indexable` is computed in the loader from `{event, name_sibling_earliest_slug}` and passed through to `head()` via `loaderData`.

### 4. Past slugs 404 in the legacy redirect

`src/routes/$slug.tsx` calls `lookupEventSlug`. Extend that server fn to treat ACTIVE-but-past events as non-existent for the catch-all redirect — return `{ exists: false }`. The real `/events/{slug}` route still serves the page; only the legacy flat-URL 301 path stops feeding past events back into the crawl set.

### 5. No sitemap resubmission yet

Last sprint's sitemap fix already excludes past events; no further change. Per your direction: don't manually resubmit the sitemap in GSC until A.5 ships, otherwise we re-prompt Google to recrawl the broken set at full volume.

## Expected impact

- **323 soft 404s** → drops to near-zero over 2–6 weeks as Googlebot recrawls and honours `noindex`.
- **889 discovered-but-not-indexed** → starts clearing as crawl budget redirects. Combined with the Sprint A title rewrite, signals on those pages will be stronger when Google does reach them.
- **Brand search safety** — one indexed instance per series (next upcoming Race for Life, next upcoming Pretty Muddy, etc.) keeps brand queries landing on a real page.
- **Zero traffic risk** — the 1,247-impression/day footprint sits on hub pages and unique events, not the duplicate-series instances being noindexed.

## Verification after deploy

1. View-source one known case from the GSC list (e.g. `/events/pretty-muddy-liverpool`) — expect `<meta name="robots" content="noindex, follow">` and no Event JSON-LD.
2. View-source the earliest upcoming `pretty-muddy-*` event — expect **no** robots meta and Event JSON-LD present.
3. Spot-check a unique future event (e.g. `/events/the-sandwich-10k-sandwich-2026`) — unchanged, indexable.
4. GSC URL Inspection on 2–3 noindexed URLs in 24–48h — expect "Excluded by 'noindex' tag" instead of soft 404.

## Files touched

- `src/lib/event-indexability.ts` *(new)* — `computeIndexability(event, siblings) → { indexable, reason }`.
- `src/lib/events.functions.ts` — extend the event detail query to include sibling-earliest lookup; pass `indexable` through.
- `src/routes/events.$slug.tsx` — read `indexable` from loader data; add `robots: noindex, follow` and skip Event JSON-LD when false.
- `src/routes/$slug.tsx` / `lookupEventSlug` — exclude past events from the legacy redirect lookup.
- `.lovable/plan.md` — record A.5 as shipped.

No DB migration. No new routes. No new tables.

## Deferred (Sprint B candidates, in order)

1. **Series hub pages** — `/series/{stem}` listing all instances; replaces noindex on duplicates with canonical-to-hub. Right endgame for Pretty Muddy / Race for Life / monthly venue series.
2. **Time-bucketed landing pages** — `/running-events/this-weekend`, `/running-events/next-weekend`, monthly pages (already on the Sprint B shortlist).
3. **410 Gone** for events confirmed permanently dead — only if `noindex` doesn't clear soft 404s by week 6.
