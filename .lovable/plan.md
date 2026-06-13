# Step 3b: proximity wording, "today" state, numeric-equivalent distance match

Three small, targeted fixes from your spot-check. No schema changes.

## 1. Reword the imminent copy (banner + FAQ together)

Current banner (`src/routes/events.$slug.tsx:304`):
> Race day is close — entries may have closed. Check the event page for availability.

New, in both places:
> Race day is near — entries may have closed. Check the linked event page for availability.

Same wording goes into the FAQ answer in `buildEventFaqs` so banner and Q&A read identically.

## 2. Add a "today" state

Extend `EventProximity` in `src/lib/date.ts` from `"imminent" | "past" | null` to `"today" | "imminent" | "past" | null`. `daysUntilStart === 0` (and end ≥ today) → `"today"`. Existing `≤ windowDays` rule still produces `"imminent"`.

Banner copy for the new state (visible page only — your call):
> Race day is today — check the linked event page for availability.

In `buildEventFaqs`, treat `"today"` the same as `"imminent"` for the entry-Q gate, with wording:
> Race day is today — check the linked event page for current availability.

Date formatting elsewhere (page title, About paragraph) stays as the full date, per your "banner only" choice.

## 3. Fix the Vitality-style miss

Real DB row: `name = "Vitality London 10,000"`, `distances = "10K"`. The current `distancesAlreadyInName` normaliser strips `,/&+` but leaves the digits split, so token `10k` doesn't match `10 000`. Fix inside the helper:

- Strip commas from the name before token comparison (so `10,000` → `10000`).
- For any distances token matching `^(\d+)k$`, also accept a match when the normalised name contains the metres form (e.g. `10k` → also check for `10000`). Same trick for `^(\d+)km$`.

Net effect: Vitality London 10,000 no longer shows the "Distances: 10K" Q. Existing pass/fail cases (Stoodley Pike Fell Race keeps its Q, Serpentine 5K still drops it) are unchanged.

## Explicitly NOT changing

- **2-Q FAQ gate stays.** Serpentine / Tempos / Rat Race continue to hide the whole block — cleaner than a single thin Q&A, per your choice.
- **No date format changes outside the banner.** "Today" lives in the banner only.
- **Charlie Kilshaw** has `distances = null`, so no distance Q is correct; nothing to do.

## Files touched

- `src/lib/date.ts` — extend `EventProximity` union, add the `"today"` branch in `eventProximity`.
- `src/lib/event-description.ts` — reword imminent FAQ, handle `"today"` in the same gate, add metres-form equivalence in `distancesAlreadyInName`, strip commas in the normaliser.
- `src/routes/events.$slug.tsx` — reword the imminent banner, add the `"today"` banner string.

## Verification after build

- Skye Half Marathon & 10K (today, 13 June 2026) → banner reads "Race day is today …"; FAQ entry Q present with today wording.
- An event 1–7 days out → banner + FAQ both read the new "near" wording.
- Vitality London 10,000 → no distance Q.
- Stoodley Pike Fell Race → distance Q still present.
- Serpentine / Tempos / Rat Race → FAQ block still hidden.
