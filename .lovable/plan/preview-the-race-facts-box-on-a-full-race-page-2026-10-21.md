# Preview the race facts box on a full race page

## What you'll see
A private preview of a real race page, exactly as runners see it, with the "Race details" box placed under the date and location, and the "Contact us" line at the bottom. Only you can open it (admin sign-in), and nothing changes on the live site.

- Open a race page with `?preview=facts` added to the address while signed in to admin, e.g. `/events/chopwell-woods-...?preview=facts`.
- The admin mock-up page gets a "View on full race page" button for the selected race.
- Signed-out visitors, and anyone without admin, see the normal page with no box.

## Technical details
- Extract the box into `src/components/event/RaceFactsBox.tsx` (same copy as the mock-up), reused by `/admin/fact-preview` so both stay identical.
- In `src/routes/events.$slug.tsx`, read a `preview` search param; when `facts`, call a new admin-checked server function that returns accepted facts + last-checked date for that one slug (private tables, read server-side only). Render the box below the date/location block and the contact line near the page foot.
- Add `noindex` when the preview param is present; no change to public data or default rendering.
- Verify with Playwright: normal page unchanged; preview param without admin shows no box.
