# Exclude Lovable traffic from analytics

## Why
The Plausible script in `src/routes/__root.tsx` loads on every host the app is served from — including the Lovable editor iframe (`lovable.dev`) and the preview hosts (`*.lovable.app`, e.g. `id-preview--…lovable.app`, `project--…lovable.app`). Every time you (or anyone) opens the editor or a preview link, those pageviews and dwell time get sent to Plausible and skew the real numbers.

We want pageviews to be sent **only** from the canonical production hostnames:
- `runningeventsnearme.com`
- `www.runningeventsnearme.com`

Everything else (lovable.dev, *.lovable.app, localhost, custom preview domains) should be a silent no-op.

## What changes

**One file: `src/routes/__root.tsx`** — replace the two `scripts:` entries that load Plausible with a single inline gate plus a conditional loader. New behaviour:

1. Inline script runs first in `<head>`. It defines `window.plausible` as a queue stub (same as today) **but** checks `location.hostname` first:
   - If hostname is in the allow-list (`runningeventsnearme.com`, `www.runningeventsnearme.com`) → install the real queue stub and dynamically inject the `pa-…js` script tag.
   - Otherwise → install a no-op `window.plausible = function(){}` so every `track(...)` call across the app silently does nothing, and the external script is never loaded.

2. Remove the unconditional `<script src="https://plausible.io/js/pa-…js" async>` from the `scripts:` array — it gets injected by the gate above only on production hosts.

Net effect:
- No Plausible script on lovable.dev, *.lovable.app, localhost, or any unknown host.
- No pageviews, no custom events (`Entry Click`, `Filter`, `Region View`, etc.) from those hosts.
- Zero changes needed in `src/lib/analytics.ts` or any call site — the existing `track()` wrapper already no-ops when `window.plausible` is missing or a stub.
- SSR safe: the inline script only runs in the browser; SSR HTML is unchanged.

## Out of scope
- No change to the Plausible dashboard config; nothing to do there.
- Not adding a "track preview as separate site" flow — the request is to stop tracking them, full stop.
- Custom domains beyond the two above aren't tracked; if you add more production domains later, extend the allow-list in this same file.

## Verification
After deploy:
- Open the editor / a `*.lovable.app` preview, DevTools → Network: no request to `plausible.io/js/pa-…js`, no request to `plausible.io/api/event`.
- Open `https://runningeventsnearme.com`: both requests fire as today.
