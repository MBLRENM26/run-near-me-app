Three small Plausible additions, all in one PR. No UI changes, no business-logic changes.

## 1. `Search Performed` event

**File:** `src/routes/search.tsx`

Inside the existing `useEffect` that runs once per resolved query (the same one that POSTs to `/api/public/track-search`), add a `track("Search Performed", { query: q, results_count: results.length, has_results: results.length > 0 })` call. Skip when `isPostcode` is true (postcode lookups redirect to the homepage — they aren't text searches). Fires once per loader resolution, not per keystroke, because the loader has already returned by then.

Add `import { track } from "@/lib/analytics"`.

## 2. Enriched `Entry Click`

**Files:** `src/lib/analytics.ts`, `src/routes/events.$slug.tsx`

Merge — keep existing props, add new ones alongside.

In `analytics.ts`, extend `trackEntryClick`'s prop type to also accept:
- `event_name: string`
- `distance?: string | null`
- `discipline?: string | null`

In `events.$slug.tsx` the call site already has `e` in scope. Pass:
- `event_name: e.name`
- `distance: e.distances ?? "unknown"` (the event shape uses `distances` string, not `distance_tags[]`)
- `discipline: e.discipline ?? "road"`

Existing `slug`, `region`, `link_type`, `proximity` are untouched, so current Plausible breakdowns keep working.

## 3. `Form: Submission` event

**File:** `src/routes/list-your-event.tsx`

After `await submit(...)` resolves successfully (just before `setSubmitted(true)`), fire `track("Form: Submission", { form: "list-your-event" })`. No `county` prop — the form has no county field today, and regex-parsing it from free text would be junk data. Revisit when the organiser-claim flow adds a proper location field.

Add `import { track } from "@/lib/analytics"`.

## Out of scope

- Adding a county input to the submission form.
- Replacing existing `Entry Click` props (we merge instead).
- Any change to the Plausible loader / goal config in `__root.tsx`.
