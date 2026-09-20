# RENM — Featured-race cards and event-photos feature session record

Date: 20 September 2026 (evening session, Lovable preview).

Status: implemented and verified in preview (325/325 tests, typecheck, live screenshot of the November half-marathons page). Not published — the live site still serves the previous build until Mike publishes. No database, schema, sync, reminder or deployment change. Governing documents untouched; local update-protocol steps (hash refresh, commit, Lovable knowledge sync) remain Mike's to run.

## What was requested and delivered

Mike flagged that a `featured` race (his own event, Peninsula 13.1 by Last Mile Running) looked underwhelming: only a small chip on card grids, no boost on month or date-search pages, and — mid-iteration — that the featured card stretched the other cards in its row. The session produced three accepted outcomes.

### 1. Featured-first ordering extended to month-filtered surfaces

`featuredFirst` (src/lib/featured.ts) already ordered homepage and main region/county landing lists. It was applied to the four remaining month-filtered surfaces — region page (`src/routes/running-events.$slug.tsx`), RegionDistancePage, DistancePage and TaxonomyLandingPage — via the existing `filterByMonth` helper, so a featured race now leads its November list while date order is preserved within each group. WeekendPage already had it.

### 2. Event photos: Peninsula 13.1 hero, mapped by slug

- Source: Mike's own "Peninsula 13 Website" project (`d1cb4af2`) — the moody riverside dawn trail-runner shot (`hero.jpg` / `peninsula-13-1-share.jpg`), copied to `src/assets/peninsula-13-1-hero.jpg`. Because Mike owns the event, this is cleared organiser-supplied media; no third-party copyright or trust exposure.
- `src/lib/event-images.ts` holds a slug-prefix map keyed `"peninsula-13-1-"`, so future editions of the race inherit the photo automatically. Adding another race photo is one map entry plus one image file — no card-code changes. Rollback is deleting the map entry (or the file).
- Covered by `src/lib/event-images.test.ts`.

### 3. Featured card final design: the whole card is the photo

After several iterations (chip → bar → photo block with separate body → full-bleed), the accepted shape is:

- when a featured event has a mapped photo, the image fills the entire card (`absolute inset-0 object-cover`) behind the content; the card keeps the exact size and shape of every other card because its height comes from the copy, not the image;
- all copy overlays the photo in white over a bottom-anchored gradient (`from-foreground/85` via `/45` to `/20`): "Featured race" label with star, race name, date (with "date TBC" for estimated), location + distance, "View details" link, recurring pill;
- no separate body panel, green bar or white separator;
- featured cards without a photo keep the solid green "Featured race" bar as fallback; non-featured cards are unchanged;
- the row-stretching problem was fixed with `items-start` on the card grids of thirteen listing surfaces, so rows now size to their own content.

## Durability assessment (recorded for tomorrow)

The card is image-agnostic: any aspect ratio crops cleanly with `object-cover` rather than distorting; any standard web format (jpg/png/webp/avif/svg) works as a normal imported asset; a missing slug or unfeatured race silently falls back to the normal design. Two soft limits, not bugs: very low-resolution images (< ~800px wide) will look soft when stretched to card size, and a very bright photo (sky/snow) could slightly reduce contrast for the white "Featured race" label under the top of the gradient — the remedy would be deepening the gradient, a one-line change if needed.

## Constraints now in force

- No AI-generated or decorative stock imagery anywhere on the site, and no screenshots of third-party organiser sites (copyright plus trust). Only cleared event-specific media. Exception: Mike's own race media is cleared organiser-supplied imagery.
- General race-photo support for other events is NOT authorised yet — the current photo renders on featured cards only (`photo && is_featured`). Any wider rollout is a separate decision, ideally organiser-supplied rather than scraped.

## Open items for review tomorrow

1. Publish decision — the featured-card work and photo are visible only in preview until Mike publishes.
2. Live-action photos from Peninsula 13.1 itself, to replace the dawn hero when available.
3. Whether to generalise the race-photo feature beyond featured cards, and on what organiser-supplied basis.
4. Local record-keeping: run `renm-knowledge.cmd --refresh-hashes`, commit canonical changes, and sync governed documents into Lovable.
