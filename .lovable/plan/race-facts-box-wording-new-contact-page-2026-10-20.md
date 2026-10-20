# Race facts box wording + new Contact page

## Wording changes (race facts mock-up)
- Remove the small label "On the race page, below the date and location".
- Make "Race details" the bold heading line.
- After the facts box, at the bottom: "We will add further updates when available. Contact us if you have more information about this event." — "Contact us" links to the new contact page.
- The "Data last checked dd/mm/yy." line stays inside the box (date only).

## New Contact page
- A simple public page at /contact: short heading, one friendly line, and the email info@hithe19.com (the address the privacy page already uses).
- Its own page title and description for search and sharing.
- No form for now (avoids spam handling and storing personal details).

## Technical details
- Edit `src/routes/_adminShell.admin.fact-preview.tsx` (lines 71–94).
- New `src/routes/contact.tsx` with head() metadata; link via `<Link to="/contact">`.
- Nothing goes live until you publish.
