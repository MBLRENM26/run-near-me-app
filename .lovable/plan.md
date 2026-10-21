# Line up "Data last checked" with "Listed"

## What changes
- Move "Data last checked DD/MM/YYYY." out of the Race details box.
- Show it on the same small grey line as "Listed …" below the box, starting at the same left edge, e.g. "Listed 3 Oct 2026 · Data last checked 20/10/2026".
- The admin mock-up page shows the date the same way, under its box.
- Pages with no checked facts are unchanged: just "Listed …".

## Technical details
- `RaceFactsBox`: drop the in-box date line and add an optional `showChecked` prop so the mock-up can still show it underneath.
- Race page: have the preview hook expose the last-checked date, and render it next to the existing "Listed" text. This applies only in admin preview mode for now.
