## Goal

Replace the empty "Featured events" section on the homepage with an **"Upcoming races"** section populated by 6 randomly chosen events from June 2026 onwards. Keep `is_featured` for future paid premium listings, and introduce a parallel `is_upcoming` flag so the two are independent toggles.

## Database

Add a new boolean column to `events`:

- `is_upcoming boolean NOT NULL DEFAULT false`

Then seed it: pick 6 random events whose `date_raw` matches a month from June 2026 onward (June, July, August, September, October, November, December — also Jun, Jul, Sep, Oct shorthand) and set `is_upcoming = true`.

`is_featured` stays as-is (unused for now, reserved for paid placements later).

## Frontend

In `src/routes/index.tsx`:

- Rename the existing "Featured events" section heading to **"Upcoming races"**.
- Change the filter from `event.is_featured === true` to `event.is_upcoming === true`.
- Keep the same layout (responsive grid, up to 6 cards, only shown when no user coordinates are set).
- Leave the EventCard unchanged.

No other pages change. No admin UI yet — we'll flip the flag in the database when we want to rotate races. (We can add a lightweight admin toggle later if you want.)

## Why this shape

- Two independent flags (`is_featured`, `is_upcoming`) means the day you start charging for premium placement, the upcoming-races section keeps working untouched and `is_featured` powers a separate "Featured / Sponsored" strip.
- "Upcoming races" is honest neutral wording — no implied editorial endorsement, so you don't burn the "Featured" label before monetising it.

## Out of scope (suggested follow-ups)

- Admin UI to toggle `is_upcoming` / `is_featured` per event.
- Auto-expire upcoming races once their month has passed (cron or scheduled function).
- A separate "Featured" strip once the first paid listing lands.
