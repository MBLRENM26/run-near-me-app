# Add `entry_domain` to Entry Click tracking

Agreed with the approach — domain-per-click is the right grain. It's cheap, gives an aggregator/operator breakdown (eventrac.co.uk, letsdothis.com, englandathletics.sport80.com, niceworkraces.com…), and pairs cleanly with the existing `link_type` prop so you can split "entry CTAs landing on aggregators" vs "entry CTAs landing on the organiser's own site". One small refinement below.

## Changes

### 1. `src/lib/analytics.ts` — extend `trackEntryClick` signature
Add `entry_domain?: string` to the props type so call sites are type-checked. Keep it optional so a malformed URL (caught by the try/catch) becomes `undefined` and the existing `clean()` helper drops it rather than sending an empty string — empty strings show up in Plausible as a real `(none)` bucket, which is noisier than just omitting the prop.

### 2. `src/routes/events.$slug.tsx` — populate at both call sites
Two `trackEntryClick` calls:
- Line ~487: primary CTA (uses `primaryCta.href`)
- Line ~520: past-event organiser link (uses `pastOrganiserLink.href`)

Add to each:
```ts
entry_domain: (() => {
  try { return new URL(primaryCta!.href).hostname.replace(/^www\./, ''); }
  catch { return undefined; }
})(),
```
(Second call uses `pastOrganiserLink.href`.)

Extracting a tiny `hostnameOf(url)` helper in the same file keeps both call sites readable; not strictly required.

### 3. Plausible dashboard — register the custom property
There is no code-side prop allow-list (Plausible auto-surfaces props once they appear), but the property only becomes *filterable / breakdownable* in the UI after it's added under **Site Settings → Custom Properties** for `runningeventsnearme.com`. Add `entry_domain` there once this ships. I'll note it in `.lovable/analytics.md` alongside the `Entry Click` row so it's not lost.

### 4. `.lovable/analytics.md` — document the new prop
Append `entry_domain` to the `Entry Click` props list with a one-line note ("hostname of outbound URL, `www.` stripped, omitted when URL is unparseable").

## Out of scope
- No change to `link_type` semantics — the existing `entry` / `organiser-site` / `organiser-other` classification stays; `entry_domain` is orthogonal.
- No change to club website clicks (`Club Website Click` already carries `host`, which is the same idea).
- No backfill — Plausible is forward-only.

## Verification
- Type-check passes (the optional prop addition is the only signature change).
- After deploy: click an entry CTA on a known event, confirm the `Entry Click` goal in Plausible shows `entry_domain` as a filterable property within ~30s.
