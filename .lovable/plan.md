## Sprint B — SEO landing pages (revised)

Build order: weekend → month (incl. distance × month) → terrain hubs + county hubs → internal linking + JSON-LD schema.

URL shape confirmed: `/running-events/july-2026` (consistent with `/running-events/{region}` family).

---

### Step 1 — "This weekend" / "Next weekend"

Routes: `/running-events-this-weekend`, `/running-events-next-weekend`

Query: ACTIVE events where `sort_date` is Sat–Sun of the relevant week, UK-only (uses `UK_BOUNDS_OR_NULL`), ordered date → distance. Discovery filter applies (organiser-owned links only). Empty same-day fallback: weekend page rolls over to next weekend Sun evening.

**Copy template (exact):**
- `<title>`: `Running Events This Weekend — {count} Races Across the UK | Entry & Info`
- `<meta description>`: `Find {count} running events happening this weekend near region/county or based on their location. Entry links, distances and venue details for races on {fri_date}–{sun_date}.`
- `<h1>`: `Running Events This Weekend`
- Subheading: `{fri_date} – {sun_date} · {count} events`

"Next weekend" mirrors with "Next Weekend" / next Sat–Sun dates.

Head: canonical + `og:url` self-reference, `ItemList` JSON-LD enumerating the listed events.

---

### Step 2 — Events by month (rolling 12 months) + distance × month

**Terrain-agnostic month hub**
- Route: `/running-events/{month}-{year}` (e.g. `/running-events/july-2026`)
- Loader: ACTIVE events in that calendar month, UK-only, discovery filter.
- Built dynamically for the next 12 rolling months.

**Distance × month**
- Routes: `/5k-races/{month}-{year}`, `/10k-races/{month}-{year}`, `/half-marathons/{month}-{year}`, `/marathons/{month}-{year}`, `/ultra-marathons/{month}-{year}` — 12 months each = 60 URLs.
- Reuses existing `getEventsByDistance` + `filterByMonth` from `month-filter.ts`.

Per-page head: unique title (`Running Events in July 2026 — {count} UK Races`), unique meta, canonical, `og:url`, `ItemList` JSON-LD, `BreadcrumbList` JSON-LD.

Sitemap: include only month URLs with ≥3 events (mirrors the region×distance threshold).

---

### Step 3 — Terrain hubs + county hubs

**Terrain hubs (4):** `/road-races` (2,362), `/fell-races` (188), `/multi-terrain-races` (426); refresh existing `/trail-running-events` (688) to surface all trail-tagged events. Same shape as distance pages — leverages `terrain_tags`.

**Editorial structure on every terrain hub (confirmed):**
1. Hardcoded **150–250 word editorial intro** about the discipline in UK running (you supply copy).
2. **FAQPage JSON-LD** with 3–4 Q&As (you supply copy).
3. Standard event list below.

> Confirmed: copy-paste content embeds cleanly. Each hub gets its own component file (e.g. `src/components/terrain/RoadRacesHub.tsx`) that takes typed `intro: string` and `faqs: { q: string; a: string }[]` as module-scope constants — pure React, no DB calls, no Markdown rendering needed. Paste copy into the constants, build picks it up.

**County hubs (~15):**
- Route: `/running-events-in/{county-slug}` (kept distinct from `/running-events/{region}` so the URL family stays unambiguous).
- Inclusion threshold: any county with ≥25 ACTIVE events that pass the discovery filter. Will run a SQL count first and ship only the qualifying slugs; rest noted in `mem://backlog/county-hubs-next-sprint`.
- Slug source: events.county (lowercased, kebab-cased), with a small manual override table for known variants (e.g. "East Riding of Yorkshire" vs "Yorkshire").
- Same shape as terrain hubs: unique title/H1/meta, canonical, `ItemList` JSON-LD, `BreadcrumbList`. No editorial intro in this sprint — that's the next pass.

---

### Step 4 — Internal linking pass

- Event detail page: add "More events in {month}" + "More {distance} races this weekend" + "More events in {county}" links.
- Homepage: new "This weekend / Next weekend / By month" rail above the existing distance/region rails.
- Footer: 12 month links + 4 terrain hub links + top county hubs.

### Step 5 — JSON-LD on existing high-traffic pages

- `FAQPage` JSON-LD on `/5k-races`, `/10k-races`, `/half-marathons`, `/marathons`, `/ultra-marathons`, `/parkrun-events` (FAQs already exist in `site-faqs.ts`, just emit schema).
- `BreadcrumbList` JSON-LD on event detail, region, distance, region×distance — breadcrumbs already render visually.

---

### Out of scope this sprint

- Terrain × region cross pages, town pages, blog content, county editorial intros, additional county hubs below the 25-event threshold.

### Verification per step

Build passes (typecheck + route tree regen), URL renders the right list, `<title>` / canonical / `og:url` self-reference, sitemap includes new URLs (above threshold), weekend/month titles roll over when the date changes (mock `new Date()` in a quick check).

### Rough credit budget

- Step 1 (weekend): ~3
- Step 2 (month + distance×month, 1 + 5 routes, 72 URLs): ~6
- Step 3 (4 terrain hubs with editorial + ~15 county hubs): ~7
- Step 4 (linking): ~2
- Step 5 (schema): ~2

≈ 20 credits total, leaves ~130 in the tank.

### Final confirmations before building

1. County slug: `/running-events-in/{county}` (not `/running-events/{county}`, to avoid colliding with the existing region family) — OK?
2. For terrain hub editorial copy, you'll send 4 blocks (intro + 3-4 FAQs each) once Step 3 starts — I'll embed verbatim, no rewriting.
