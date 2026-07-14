## Workstream C — Audience value pages

Ship three new routes with approved copy, own head() metadata per route, and add a desktop "Why us" menu linking to them. Footer gets the same three links. Mobile nav unchanged.

### Files to create

1. `src/routes/for-runners.tsx`
2. `src/routes/for-clubs.tsx`
3. `src/routes/for-organisers.tsx`

Each is a static route:
- `createFileRoute("/for-runners")` etc.
- `head()` returns approved meta title, description, og:title, og:description, og:url, plus `<link rel="canonical">` (leaf-only, per head-meta rules).
- Component renders H1, intro, value blocks, FAQ. Reuse existing Tailwind prose/section patterns from the taxonomy landing pages so styling is consistent — no new component library.
- FAQPage JSON-LD via `scripts` array (matches other content routes with FAQs).

### Files to edit

4. `src/components/site/Header.tsx` — add a desktop-only "Why us" dropdown (or simple inline links group, hidden on mobile via `hidden md:flex`) with three `<Link>`s to the new routes. Mobile view untouched.
5. `src/components/site/Footer.tsx` — add the three links to the existing footer nav row (grouped so they don't overwhelm the existing About / Running clubs / Privacy / List your event links).

### Header pattern

Small dropdown/popover keyed off the existing header structure — reuse shadcn primitives already in the project if a dropdown exists, otherwise a simple hover-group with three links. Confirm the approach when I read `Header.tsx` in build mode; if no dropdown primitive is wired up already I'll use a lightweight `<details>` or grouped inline links rather than pull in new UI.

### Out of scope

- No sitemap edit — `src/routes/sitemap[.]xml.tsx` should already crawl static routes; I'll verify in build mode and only touch it if these routes need to be added explicitly.
- No changes to taxonomy pages, event pages, or discovery gates.
- No og:image generation (per head-meta rules, no placeholder image is better than a generic one).

### Verification

- Read final files after write to confirm route strings match filenames, head() shape is correct, and canonical/og:url self-reference each route.
- Spot-check the header on desktop viewport; confirm mobile nav visually unchanged.
