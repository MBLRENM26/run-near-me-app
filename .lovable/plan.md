Apply the approved editorial copy to the four terrain hub pages, fix the language errors, and bring /trail-running-events into the same terrain-hub pattern as the other terrain pages.

### Changes
1. **Replace TODO copy in `src/content/terrain-copy.ts`** with the four supplied blocks (road, fell, multi-terrain, trail), applying the approved edits:
   - Fix the fell intro geography error (Lake District, Ben Nevis, Yorkshire are correctly grouped).
   - Fix typos/fragments: "on site", stray comma, "are still be", lowercase domain, etc.
   - Light SEO polish: front-load keywords in road intro, append fell category codes, include "multi-terrain running" once, soften "fastest-growing" in trail intro.
2. **Refactor `/trail-running-events` into a terrain hub** instead of a distance page. Create a new `TrailRunningEventsHub` route config (or reuse `TerrainHubPage` with a trail config) that loads events via `getEventsByTerrain({ terrain: "trail" })` so it matches /road-races, /fell-races, and /multi-terrain-races. The existing route file becomes the new terrain-hub route, preserving URL and sharing the same title/H1/meta/FAQ/ItemList structure.
3. **No changes to the other three terrain hubs** — their route files and `TerrainHubPage` component already support the new copy and FAQ schema; only the data file changes.

### Verification
- Typecheck passes.
- Each terrain hub renders the correct intro, FAQ accordion, and event list.
- `/trail-running-events` now shows trail-tagged events (≈688) with the same hub layout as the other terrains.
- JSON-LD FAQPage and ItemList emitted on all four hubs.