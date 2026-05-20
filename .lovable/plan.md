## Distance landing pages (6 + parkrun queued)

Build six high-intent SEO landing pages aggregating events by distance, with FAQ structured data for featured snippets. Parkrun queued as a 7th page after the core six ship.

### Routes

```
/5k-races              → 5K
/10k-races             → 10K
/half-marathons        → Half Marathon
/marathons             → Marathon (26.2 only — no ultras)
/trail-running-events  → Trail / Fell / Hill / Multi-Terrain
/ultra-marathons       → Ultra
```

Queued (not built this round): `/parkrun-events` — 1,391 parkrun locations in the data, high-volume "parkrun near me" intent. Will be its own follow-up because parkrun is recurring/weekly (different data shape — needs a location-grouped layout, not a date list).

Flat route files in `src/routes/` (`5k-races.tsx`, `10k-races.tsx`, etc.). Each is a thin wrapper passing a config object into a shared `<DistancePage>` component.

### Year constant

Single source of truth at the top of `src/lib/site.ts`:

```ts
export const CURRENT_YEAR = 2026;
```

Imported by every distance route, the homepage title, and the FAQ content. January bump = one line.

### Matching logic

The `distances` column is messy free-text (`"5K"`, `"5 km"`, `"5K, 10K"`, `"5 km | 10 km | Half Marathon"`). Centralise in `src/lib/distance-filters.ts`:

```ts
export const DISTANCE_FILTERS = {
  "5k":            { include: ["%5k%", "%5 km%", "%5km%"], exclude: ["%50k%", "%500%", "%15k%", "%25k%", "%35k%", "%45k%"] },
  "10k":           { include: ["%10k%", "%10 km%", "%10km%"], exclude: ["%100k%", "%110k%"] },
  "half-marathon": { include: ["%half marathon%", "%half-marathon%", "%halfmarathon%"] },
  "marathon":      { include: ["%marathon%"], exclude: ["%half%", "%ultra%"] }, // 26.2 only
  "trail":         { include: ["%trail%", "%fell%", "%hill race%", "%multi-terrain%", "%multi terrain%"] },
  "ultra":         { include: ["%ultra%"] },
};
```

Server query chains `.or("distances.ilike.X,distances.ilike.Y,...")` for includes and `.not("distances", "ilike", Z)` per exclude. Always: `status='ACTIVE'`, `sort_date >= today OR NULL`, UK bbox (lat 49.9–60.9, lng -8.6–1.8) — same as region pages.

### Server function

New `getEventsByDistance` in `src/lib/events.functions.ts`:
- Input: `{ distanceKey: "5k" | "10k" | "half-marathon" | "marathon" | "trail" | "ultra" }` (Zod validated)
- Returns: `{ events: EventCardData[], regionCounts: { region: string; count: number }[], total: number }`
- Uses `supabaseAdmin`, paginates 1000-row pages

### Page layout (shared `<DistancePage>`)

In `src/components/distance/DistancePage.tsx`:

1. **Hero** — H1 (`"5K Races in the UK 2026"`), one-line intro, total count
2. **Distance nav row** — 6 pill links to sibling distance pages (also rendered on home + region pages)
3. **Event grid** — reuses existing `EventCard`
4. **Regional breakdown** — 12 internal links to `/running-events/{region}` with counts. Strong internal-linking play.
5. **FAQ block** — 4 distance-specific Q&As (visible accordion using existing shadcn `<Accordion>`)
6. **Cross-links** — "Looking for something different?" row

### SEO — title, meta, JSON-LD

Per-route `head()`:

- **Title**: `"5K Races in the UK ${CURRENT_YEAR} — ${SITE_NAME}"`
- **Description**: `"Find ${total} upcoming 5K races across the UK in ${CURRENT_YEAR}. Browse by region, enter online or contact organisers directly."`
- **Canonical**: `${SITE_URL}/5k-races`
- **OG**: title/description/url, `og:type=website`

**JSON-LD — two schemas per page (this is the key SEO play):**

1. `CollectionPage` describing the listing
2. `FAQPage` with the 4 Q&As as `mainEntity[].acceptedAnswer.text` — this is what Google reads for featured snippets / People Also Ask. The accordion text and the JSON-LD must match exactly (define the Q&As as a single `const FAQS` array per distance and render both UI and JSON-LD from it).

Example FAQ content for `/5k-races`:
- "How long is a 5K race?" → "A 5K is 5 kilometres, or 3.1 miles. Most runners complete one in 20–40 minutes."
- "How much does a 5K race cost to enter?" → cost range from UK data
- "What's a good 5K time?" → benchmarks by age/experience
- "Where can I find a 5K near me?" → CTA to homepage location prompt

Each distance gets its own 4 Q&As written for the specific distance.

### Sitemap

Update `src/routes/sitemap[.]xml.tsx`: add the 6 distance routes with `weekly` changefreq, `0.9` priority (above region pages at 0.8, below homepage at 1.0).

### Internal linking — drive authority to the new pages

- **Homepage** (`src/routes/index.tsx`): add `<DistanceNav />` between "Browse by region" and the upcoming events list
- **Region pages** (`src/routes/running-events.$slug.tsx`): add `<DistanceNav />` above the event grid
- **Event detail** (`src/routes/events.$slug.tsx`): contextual single link in the back-link area — "More {distance} races →"

### Files

**New:**
- `src/routes/5k-races.tsx`
- `src/routes/10k-races.tsx`
- `src/routes/half-marathons.tsx`
- `src/routes/marathons.tsx`
- `src/routes/trail-running-events.tsx`
- `src/routes/ultra-marathons.tsx`
- `src/components/distance/DistancePage.tsx`
- `src/components/distance/DistanceNav.tsx`
- `src/lib/distance-filters.ts` (matchers + FAQ content + page config in one place)

**Edited:**
- `src/lib/site.ts` — add `CURRENT_YEAR`
- `src/lib/events.functions.ts` — add `getEventsByDistance`
- `src/routes/sitemap[.]xml.tsx` — add 6 entries
- `src/routes/index.tsx` — add `<DistanceNav />`
- `src/routes/running-events.$slug.tsx` — add `<DistanceNav />`
- `src/routes/events.$slug.tsx` — contextual distance link

No DB migrations needed.

### After this ships

Parkrun page (`/parkrun-events`) becomes the next ticket — separate plan because the data model is location-grouped weekly events, not a one-off race list.
