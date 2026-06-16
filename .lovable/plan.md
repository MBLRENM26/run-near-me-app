## Problem

Homepage `LocationPrompt` only handles postcodes. Typing "Big Half" (or any non-postcode) submits to `postcodes.io`, fails, and toasts "Couldn't find that postcode." That's a dead end for what is obviously a text search intent.

## Fix

`src/components/events/LocationPrompt.tsx` — `submitPostcode` handler.

Before calling `postcodes.io`, check `isUkPostcode(trimmed)` (already exported from `src/lib/postcode.ts`). If false, redirect to the text-search page instead:

```ts
import { useNavigate } from "@tanstack/react-router";
import { isUkPostcode } from "@/lib/postcode";

// inside the component:
const navigate = useNavigate();

// inside submitPostcode, right after the empty-trim guard:
if (!isUkPostcode(trimmed)) {
  navigate({ to: "/search", search: { q: trimmed } });
  return;
}
// existing postcodes.io flow stays as-is for valid postcodes
```

That's it — one branch, one navigate call. Existing postcode behaviour (lookup → `onLocate` with lat/lng) is untouched.

## Light copy polish (same file)

The input still claims to only accept postcodes, which is misleading now that it accepts text too. Update:

- `placeholder`: `"Postcode or event name"` (was `"Enter a postcode (e.g. SW1A 1AA)"`)
- `<label>` sr-only text: `"Postcode or event name"` (was `"Enter a UK postcode"`)
- `aria-label` on the submit button: `"Search"` (was `"Search by postcode"`)
- Drop `autoComplete="postal-code"` — it's no longer accurate.

## Out of scope

- The header search input (`HeaderSearch.tsx`) — already routes correctly via `/search`.
- The `/search` route's own postcode→homepage redirect (already correct via `isUkPostcode`).
- Any change to `isUkPostcode` regex — current behaviour (only full postcodes match) is what makes this fix safe.

## Verification

1. Type `Big Half` → submits → lands on `/search?q=Big+Half` with text results.
2. Type `SW1A 1AA` → postcode lookup runs → map recentres on London (existing behaviour).
3. Type `BD9` (partial) → falls through to `/search?q=BD9` (consistent with the comment in `postcode.ts` that partials should be text searches).
