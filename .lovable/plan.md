## 1. LocationPrompt — postcode-first, geolocation as fallback

I'd push back on removing "Use my location" entirely. Killing it gives up the one-tap path on mobile (where most traffic sits) and you can't tell from current data whether the button is off-putting or just visually losing to a more familiar input. Suggest a middle path we can measure: make the postcode/search box the hero and demote geolocation to a small secondary affordance — keep the capability, remove the "data share" vibe.

**Changes in `src/components/events/LocationPrompt.tsx`:**

- Reorder so the postcode/search form is the primary control, full width on all breakpoints.
- Replace the big primary "Use my location" button with a subtle text-link / ghost-button under the input: e.g. "Or use my current location" with a small `MapPin` icon, `variant="ghost"` `size="sm"`, muted foreground. No "share" language.
- Loading + denied toasts stay as-is.
- Keep the existing `trackLocationSet("device" | "postcode")` analytics — gives us a clean before/after read on whether postcode usage actually rises and whether total location-sets hold up.
- No changes to `geocodePostcode`, navigation flow, or homepage layout above/below this component.

Out of scope: removing geolocation code, redesigning the homepage hero, changing `HeaderSearch`.

## 2. Event page primary CTA — larger, not swallowed by reminder block

**Changes in `src/routes/events.$slug.tsx` (CTA block ~line 572–602 only):**

- Wrap the CTA in a contained band: `mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6` so it reads as a distinct action zone rather than a loose button above body copy.
- Make the button visually heavier on desktop: `size="lg"` stays, add `className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg w-full sm:w-auto font-semibold shadow-card"`. Full-width on mobile, auto on desktop so it doesn't stretch awkwardly on wide screens but is clearly bigger than the reminder form's "Remind me" button.
- Keep `ExternalLink` icon, keep tracking call unchanged.
- `proximityNote` moves inside the same band, below the button.
- No change to the past-event block or the `RaceReminderSignup` component itself — the visual separation alone fixes the "swallowed by email ask" problem because the CTA now sits in its own card with a primary tint while the reminder stays a neutral card.

Out of scope: restructuring page layout, changing `RaceReminderSignup`, sticky/floating CTAs (can revisit if this isn't enough).

## Verification

- `bun run build` for typecheck.
- Playwright screenshot of homepage (desktop + mobile viewport) to confirm postcode is primary and "use my location" reads as secondary.
- Playwright screenshot of one future event page (desktop) to confirm CTA band is visually dominant vs reminder card.

## Technical notes

- `LocationPrompt` currently uses `grid sm:grid-cols-2` putting both controls at equal weight — that's the root of the problem, not the button label alone. Switching to a stacked layout with the geolocation as a tertiary action is a one-file change.
- Event CTA currently has no container, just `<div className="mt-8"><Button size="lg">` — adjacent to it the `RaceReminderSignup` is wrapped in `rounded-2xl border bg-card p-5 sm:p-6 shadow-card`, which is why the reminder visually outweighs the CTA. Giving the CTA its own tinted card restores the hierarchy without touching surrounding logic.
