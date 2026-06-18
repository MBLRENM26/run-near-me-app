## What's actually happening

The code in `src/components/events/LocationPrompt.tsx` is correct. The browser is genuinely returning `PERMISSION_DENIED`, and there are two likely reasons:

1. **The Lovable preview iframe doesn't grant geolocation.** Cross-origin iframes need an explicit `allow="geolocation"` permissions-policy attribute on the `<iframe>` tag to be allowed to prompt for location. The preview iframe (`id-preview--…lovable.app`) doesn't set this, so `getCurrentPosition` is auto-rejected without ever showing a prompt. **This will work fine on the published domain** (`runningeventsnearme.com`) where the site is top-level, not in an iframe.
2. **A previous denial is cached.** If you (or anyone) hit "Block" once on `runningeventsnearme.com`, Chrome/Safari remembers it per-origin until you clear it via the address-bar padlock.

So this is a real-world UX issue worth tightening, not a code bug. The current toast says "Try a postcode instead" but doesn't tell the user *why* or *how to fix it*.

## Proposed changes (small, presentation-only)

**1. Detect permission state up front using the Permissions API.**
Before calling `getCurrentPosition`, query `navigator.permissions.query({ name: "geolocation" })`. If `state === "denied"`, skip the geolocation call entirely and show a more helpful message:

> "Location is blocked for this site. Tap the padlock in your address bar → Site settings → Allow location. Or use a postcode."

Safari doesn't support the Permissions API for geolocation — fall back to the current flow there (try, catch denial).

**2. Detect iframe context and tell the truth.**
If `window.self !== window.top` (running inside the Lovable preview iframe) AND we get `PERMISSION_DENIED`, show:

> "Location can't be used inside the preview. It will work on the live site, or use a postcode."

This stops you (and any other preview viewers) thinking the live site is broken.

**3. Keep the existing postcode fallback prominent.**
No change — it already works. We're just making the error toasts truthful.

**4. De-dupe the toast.**
Pass `{ id: "geo-denied" }` to `toast.error` so rapid double-clicks don't stack two identical toasts (saw this in the session replay).

## Files touched

- `src/components/events/LocationPrompt.tsx` — only file changed. ~25 lines added inside `useDeviceLocation`. No new deps, no API/DB changes, no analytics changes.

## What this does NOT do

- Doesn't try to make geolocation work inside the preview iframe — that requires a platform change to the iframe's `allow` attribute, which isn't in our code.
- Doesn't change the postcode flow, the search route, or analytics events.
- Doesn't add a new component or hook.

## Verification

Manual: in the preview, click "Use my location" → expect the new iframe-specific toast. On the published site in a fresh browser profile, click → expect the native browser permission prompt. If denied, expect the new "unblock via padlock" toast on the next click.
