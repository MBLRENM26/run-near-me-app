## Scope check

**Step 1 (BreadcrumbList JSON-LD) is already done.** `src/routes/events.$slug.tsx` lines 250–281 already emit a `BreadcrumbList` schema (`Home → {Region} → {Event}`) using `regionSlugFromName` + `SITE_URL`, with the region step skipped when no region is mapped. The visual breadcrumb on the page matches it. No work needed — I'll confirm in the SEO findings panel and mark any stale finding fixed.

That leaves Step 4 — inline links from event pages to the new Sprint B pages.

## Step 4 — Inline links on event pages

Edit `src/routes/events.$slug.tsx` only. No new components, no new layout rows.

### Date row → month (and distance×month) link
- Wrap the existing `{dateLabel}` text in the date row with a `<Link>` to `/running-events/{month-year}`, using `monthSlugFromKey` derived from `e.sort_date` (or `e.date_from`).
- Skip linking when:
  - date is estimated (`e.date_is_estimated`) — month is uncertain, and date label already carries "(date TBC)",
  - event is past (`eventProximity(e) === "past"`) — monthly hubs are forward-looking,
  - no usable date exists.
- If `related.distanceKey` is one of `5k | 10k | half-marathon | marathon | ultra`, append a second small inline link `· in {distance} this month` pointing to `/{distance}-races/{month-year}` (matching the existing distance-month routes already created). The "(date TBC)" suffix and the "Took place" pill keep their current position.

### Terrain row → terrain hub link
- In the terrain row (line ~485), wrap the matching label segment in a `<Link>` when `e.terrain_tags` contains an exact hub tag:
  - `road` → `/road-races`
  - `fell` → `/fell-races`
  - `trail` → `/trail-running-events`
  - `multi-terrain` → `/multi-terrain-races`
- Only the matching label inside the slash-joined string becomes a link (e.g. "Road / Trail" → both linked; "Cross-country" → unlinked). Discipline-only fallback text stays unlinked — no guessing from free-text discipline.

### Implementation details
- New tiny helper file `src/lib/event-internal-links.ts` exporting:
  - `monthLinkForEvent(e)` → `{ slug, label } | null`
  - `distanceMonthLinkForEvent(e, distanceKey)` → `{ to, params, label } | null`
  - `terrainHubFor(tag)` → route descriptor or null
- Keeps the route file lean and lets us unit-test guard conditions later.
- Reuses existing `monthSlugFromKey` / `formatMonthYearLong` from `src/lib/month-slug.ts`.
- Inline links use `text-foreground hover:text-primary underline-offset-2 hover:underline` (subtle, in-flow), no icon, no chip.

### Out of scope (explicit)
- No links on parkrun pages (`/parkrun-events/$slug`) — they have their own hub structure.
- No county link in the location row — county hubs only exist for ~15 large counties; mapping every event reliably is a separate step.
- No analytics event for these clicks in this pass.

## Verification
- `bun run build` passes; routeTree unchanged.
- Spot-check 3 events on the live preview:
  1. A future road 10K with a real region → month link, distance×month link, terrain link all rendered.
  2. A date-TBC event → no month link, terrain link still renders if matching.
  3. A past event → no month link, no distance×month link; terrain link still renders.
- View-source confirms `BreadcrumbList` JSON-LD is present (it already is) and that the new `<a>` hrefs resolve to existing routes.
