### Problem

On the live site, "Use my location" from Greenhithe (Kent) shows **"No events within 25 miles"**, even though the DB has **392 events / 144 parkruns within 25 mi of Greenhithe**. The UI gives no signal whether (a) geolocation returned the wrong coords or (b) the Supabase RPC silently errored — both look identical right now.

### Fix (3 small, additive changes)

**1. Reverse-geocode device coords → real place name** (`src/components/events/LocationPrompt.tsx`)

After `getCurrentPosition` succeeds, call `https://api.postcodes.io/postcodes?lon=…&lat=…` (same provider already used for postcode lookup, no new dep, no key) and use the nearest postcode/admin district as the label. Fall back to "Your location" if it fails.

Why: turns the generic "Your location" into e.g. "DA9 9…" or "Dartford" — instantly tells you whether geolocation landed in the right place. This alone diagnoses case (a).

**2. Surface RPC errors in the nearby query** (`src/routes/index.tsx`)

Pull `error` off `useQuery` and render a distinct state above the empty card when present: *"Couldn't load events right now. Please try again."* (no raw error text to the user, but log details to console so I can read them in your next message). Diagnoses case (b).

**3. Add a "Why am I seeing this?" hint to the empty state**

When 0 results, show a one-line note: *"Showing events near {label} ({lat.toFixed(2)}, {lng.toFixed(2)})"*. If the coords look wrong, you'll see it immediately and can use a postcode instead.

### Out of scope (deliberate)

- Not changing the `events_within_radius` RPC — verified working, returns 392 results for your coords.
- Not touching parkrun filtering — they're included in the RPC and rendered in their own block already.
- Not adding a "promote my own race" admin flow — separate request. Once we know the live site can reach the DB, the right path for races you're running is to mark them `is_featured = true` in admin so they surface in "Featured events near you".

### Technical notes

- Reverse geocode endpoint: `GET https://api.postcodes.io/postcodes?lon={lng}&lat={lat}&limit=1&radius=2000`. Returns `result[0].postcode` and `result[0].admin_district`. Free, no key, already trusted by this codebase.
- Keep the call non-blocking: set coords immediately with `"Your location"`, then patch the label once the lookup resolves so the events query isn't delayed.
- Error logging: `console.error("[home/nearby]", error)` only — no toast spam, no PII.

After you ship this and reload on the live site, your next screenshot will tell us in one glance which of the two causes it is, and we fix from there.