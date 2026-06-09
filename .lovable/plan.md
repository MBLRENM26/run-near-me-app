# Soften the CTA for imminent and past events

## What changes
On the event detail page, when an event's date is within the next 7 days (or already past) and the link is an event-specific entry page:

- Button label changes from **"Enter now"** to **"View event details"**.
- A short note appears under the button: *"Race day is close — entries may have closed. Check the event page for availability."* (past events get *"This event has taken place."* instead, with no availability note).
- "Visit organiser website" links stay unchanged — that label makes no entry promise.
- JSON-LD: the `offers` block (which implies availability "InStock") is dropped for events within the 7-day window or past, so structured data never overpromises either.

## Technical details
- Add a small helper in `src/lib/date.ts` (or inline in the route): days until `date_from ?? sort_date`, ignoring estimated-only dates.
- Apply in `src/routes/events.$slug.tsx` where `primaryCta` is built and in `head()` where `jsonLd.offers` is set.
- No database or scraper changes.

## Verification
- Rock Up n Run Marsden (11 June, 2 days away) shows "View event details" + the note.
- A far-future event (e.g. an autumn race) still shows "Enter now" with no note.
