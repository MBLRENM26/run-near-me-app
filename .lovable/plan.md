# Featured card: full-bleed photo, all copy overlaid

## What you'll see

On the Peninsula 13.1 featured card, the photo will fill the **entire card** — same size and shape as every other card in the row (the content sets the height, exactly like a normal card). Every piece of copy sits directly on the photo in white, over a dark gradient at the bottom so it stays readable:

- "Featured race" label with star (top)
- Race name (linked)
- Date, location, distance (with their icons)
- "View details →"

No white details section, no green bar, no chip — the card *is* the photo.

Cards without a photo (everything else on the site) keep the current look unchanged, including the solid green "Featured race" bar for any featured event that has no photo yet. The `items-start` grid fix from earlier stays, so rows won't stretch.

## Technical details

Single-file change in `src/components/events/EventCard.tsx`:

- When a featured event has a photo: the `<img>` becomes `absolute inset-0 h-full w-full object-cover` behind the article content; the article keeps its normal `p-5` padding and flex layout (so the card height matches a regular card with the same content), with `relative` positioning and the existing rounded/border/ring/hover styling.
- A bottom-anchored gradient (`from-foreground/85` → transparent) sits over the photo for text legibility.
- All copy in the photo branch renders in white (`text-background`): featured label, name, date/location/distance rows (icons inherit), and the "View details" link (white with underline on hover instead of primary-colour).
- The separate `h-56` photo block, the conditional `pb-5`/`pt-4` padding tweaks, and the split "name overlay + white details section" structure are removed.
- Non-photo featured cards keep the green bar treatment as the fallback.

## Verification

- Run the test suite (featured/event-images tests unaffected but confirm green).
- Screenshot the November half-marathons page to confirm the featured card is full photo, normal size, all text readable.
