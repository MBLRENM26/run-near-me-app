## Problem

`isUkPostcode` in `src/lib/postcode.ts` only matches full postcodes (e.g. `DA9 9AA`). Outward-only codes like `DA9` or `ME5` fall through to the text search branch in `LocationPrompt.submitPostcode`, sending users to `/search?q=DA9` instead of geocoding to a lat/lng and showing nearby events.

postcodes.io supports outward codes via `GET /outcodes/{outcode}`, which returns a centroid lat/lng — exactly what the "search near me" flow needs.

## Fix

Add outward-code support alongside full postcodes, then geocode outward codes via `/outcodes/{outcode}` instead of `/postcodes/{postcode}`.

### `src/lib/postcode.ts`

- Add `OUTWARD_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i`.
- Export `isUkOutwardCode(q)` and a combined `isUkPostcodeOrOutward(q)`.
- Add `geocodeOutward(q)` that hits `https://api.postcodes.io/outcodes/{outcode}` and returns `{ postcode, lat, lng }` (using the outcode as the label, e.g. "DA9").

### `src/components/events/LocationPrompt.tsx`

In `submitPostcode`:
1. If `isUkPostcode(trimmed)` → existing full-postcode branch.
2. Else if `isUkOutwardCode(trimmed)` → call `geocodeOutward`; on hit call `onLocate({ lat, lng, label: outcode.toUpperCase() })` and `trackLocationSet("postcode")`; on miss show the same "Couldn't find that postcode" toast.
3. Else → existing text-search fallback to `/search?q=…`.

### `src/components/site/HeaderSearch.tsx`

Mirror the same three-way branching so header search behaves identically. Read the file first to confirm current shape before editing.

## Verification

- `DA9` and `ME5` → geocode to centroid, homepage shows nearby events with label "DA9" / "ME5".
- `DA9 9AA` → unchanged (full-postcode path).
- `parkrun` → still routes to `/search?q=parkrun`.
- Bogus outcode `ZZ9` → friendly "Couldn't find that postcode" toast, no navigation.

## Out of scope

- No RPC / DB changes.
- No change to reverse-geocode-on-device-location.
- No new taxonomy or landing pages for outcodes.
