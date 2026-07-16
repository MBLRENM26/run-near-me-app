## Problem

In `src/components/site/Header.tsx`, the "Why us" dropdown is wrapped in `<div className="hidden md:block">`, so it disappears below 768px. On mobile the header only shows the logo, search icon, and "List your event".

## Fix

Remove the `hidden md:block` wrapper so the "Why us" dropdown renders at every breakpoint alongside "List your event".

Mobile header row will be: logo · search · Why us ▾ · List your event.

### Notes

- The nav container is already `flex items-center gap-3`, which handles the extra item fine at 375–485px widths (logo subtitle is already `hidden sm:block`, so it collapses to just the icon + title on narrow screens, leaving room).
- Dropdown uses Radix `DropdownMenu`, which positions correctly on touch — no extra mobile handling needed.
- No changes to routing, data, or the audience pages themselves.

## Out of scope

- No redesign into a hamburger/sheet menu. If the row gets too tight on very small devices later, we can revisit with a mobile sheet — but current content fits.
