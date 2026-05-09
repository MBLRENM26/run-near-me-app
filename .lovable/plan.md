## Pre-launch review — what's good, what to tighten

### Codebase: in good shape
- Clean route structure (`/`, `/running-events/$slug`), shared `regions.ts` helper, semantic design tokens, proper SSR-safe Supabase client usage.
- 1,900 events, all geocoded, all 12 regions populated. No nulls in lat/lng.
- `__root.tsx` has both `notFoundComponent` and `errorComponent`. Good.

### Security: solid baseline, two things worth verifying
- `events` table has RLS enabled with public SELECT only — correct for a public directory. No INSERT/UPDATE/DELETE policies, so the table is effectively read-only from the client. Good.
- No auth, no PII, no user-generated content → attack surface is tiny.
- Worth doing before launch: run the Supabase linter once to catch anything I've missed (e.g. function search_path warnings).

### Recommendations before connecting the domain

**1. SEO essentials (high value, low effort)**
- Add a `robots.txt` and a `sitemap.xml`. With 1,900 events + 12 region pages, a static sitemap built at deploy time will help indexing significantly.
- Add JSON-LD `Event` schema to each EventCard / region page so Google can show rich results.
- Add a canonical URL to each page's `head()`.
- Region pages currently have generic meta — fine, but adding event count ("368 races in South East") would improve CTR.

**2. UX polish**
- Yorkshire only has 12 events — looks suspicious vs South East's 368. Worth a quick sanity check on the CSV import (could be a region-name mismatch like "Yorkshire and the Humber").
- Homepage shows nothing until the user grants location or enters a postcode. Consider showing **featured events** (`is_featured = true`) above the location prompt so the page isn't empty on first load.
- Region pages have no filters (distance type, search). Could add later, not blocking.
- No "event detail" page — clicking a card goes to the external `url`. That's fine for MVP but means zero internal pageviews per event (bad for SEO long-term). Consider `/events/$id` pages post-launch.

**3. Performance**
- Homepage fetches **all 1,900 events** in one query, then filters client-side. Works fine at this size, but if you add more it'll get heavy. For now: OK.
- Add image `loading="lazy"` if/when you add event images.

**4. Pre-launch checklist**
- Run Supabase linter.
- Set a proper favicon + apple-touch-icon.
- Verify Open Graph image (currently none → ugly link previews on social).
- Confirm Google Analytics / Plausible (or similar) is wired up if you want traffic data from day 1.
- Test the geolocation flow on the published HTTPS domain (some browsers block it on previews).

### Suggested order if you want me to action any of this
1. Sitemap + robots.txt + JSON-LD (biggest SEO win)
2. Open Graph image + favicon
3. Featured events on homepage
4. Investigate Yorkshire row count
5. Run Supabase linter and fix anything flagged

Tell me which (if any) you want me to do before we hook up the domain — or say "ship it" and we'll connect the domain now.