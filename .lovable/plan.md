## Fix 1 — "View event" URL priority (entry_url → organiser_url → source_url)

**`EventCardData` (in `src/components/events/EventCard.tsx`)**
- Replace the single `url` field with the three source fields: `entry_url`, `organiser_url`, `source_url` (all `string | null`).
- Compute `const viewUrl = [entry_url, organiser_url, source_url].map(s => s?.trim()).find(Boolean) ?? null`.
- Only render the "View event" `Button` when `viewUrl` is truthy.

**Query selects** — stop aliasing `entry_url` to `url`; select all three:
- `src/routes/index.tsx` upcoming query: `select("id, name, date_raw, town, county, distance_type:distances, entry_fee, entry_url, organiser_url, source_url, is_featured")` and drop the manual mapping at lines 244–258 (pass fields directly).
- `src/routes/running-events.$slug.tsx`: same select change.

**RPC `events_within_radius`** — currently returns `entry_url as url` only. Migration to extend the returned columns with `organiser_url` and `source_url` (keep `url` for backward-compat or rename — I'll rename: drop `url`, add `entry_url`, `organiser_url`, `source_url`). The signature change means `types.ts` regenerates; the homepage mapping at lines 100–112 updates to pass the three fields through.

## Fix 2 — Hide price badge when no real fee

In `EventCard.tsx`, replace the always-on price line:
```ts
const NON_FEE = new Set(["", "free", "tbc", "0"]);
const showFee = event.entry_fee && !NON_FEE.has(event.entry_fee.trim().toLowerCase());
```
Only render the `<span>{event.entry_fee}</span>` when `showFee`. Keep the footer row layout — if no fee and no URL, the row collapses; if only the button, it right-aligns.

## Fix 3 — UK bounding box on region pages

UK bounds: lat 49.9–60.9, lng -8.6–1.8.

**`src/routes/running-events.$slug.tsx`** — add to the existing query chain:
```ts
.gte("lat", 49.9).lte("lat", 60.9)
.gte("lng", -8.6).lte("lng", 1.8)
```

This filters out events with NULL coordinates as well as overseas ones. That's the intended behavior for region pages (a region listing without geolocation is unreliable anyway). I'll note this in the response so the user can confirm; if they want NULL-coord events kept, we'd switch to an `.or()` with `lat.is.null` — but the requirement as stated is "only events with coordinates inside the UK".

The homepage nearby query uses the RPC (already coordinate-bounded by user location) and the homepage upcoming query is global "across the UK" — no bbox filter needed there.

## Files touched

- `src/components/events/EventCard.tsx` — new fields, viewUrl computation, fee filter
- `src/routes/index.tsx` — select all three url fields, drop manual mapping, update RPC field mapping
- `src/routes/running-events.$slug.tsx` — select three url fields + UK bbox filter
- Migration: redefine `events_within_radius` to return `entry_url`, `organiser_url`, `source_url` instead of `url`

## Open question

The region-page bbox will also exclude events with NULL lat/lng. Confirm that's what you want, or should I keep NULL-coordinate events visible (filtering only out-of-bbox ones)?
