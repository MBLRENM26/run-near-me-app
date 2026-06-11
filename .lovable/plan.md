## SEO cleanup — ghost URLs from Google Search Console

You're right: a blind catch-all `/{slug}` → `/events/{slug}` redirect would hide real 404s (e.g. a typo in a region or distance page). The redirect must only fire when the slug resolves to a real, active event in the DB. Anything else stays a 404 so we can see and fix it.

### What this fixes

The four GSC validation failures:

1. `/index.html` — never a valid URL on TanStack Start.
2. `/vitality-london-10k` — legacy flat path; current canonical is `/events/vitality-london-10k`.
3. `/big-half` — same legacy shape.
4. `/running-events/$slug` — literal route template that leaked into a link or sitemap entry at some point.

### Changes

**1. DB-checked legacy event redirect** — `src/routes/$slug.tsx` (splat-free single-segment catch route, lowest priority)
- Server handler: look up the slug in `events` (active only). If found → 301 to `/events/{slug}`. If not found → return TanStack's `notFound()` so the normal 404 page renders.
- Important: this route must NOT shadow existing top-level routes (`/5k-races`, `/marathons`, `/list-your-event`, etc.). TanStack file routing already prefers a concrete route file over a `$slug` catch — verified by the existing route list. We'll also keep an explicit deny-list of reserved first-segment names as a belt-and-braces guard inside the handler, so even if someone later adds an event with slug `marathons`, the redirect won't hijack a real page.
- The component just renders the 404 page (handler does the redirect server-side before render).

**2. `/index.html` → `/` redirect** — `src/routes/index[.]html.tsx`
- Server handler returns a 301 to `/`. Tiny, surgical.

**3. Sitemap & link audit for `$slug` literal**
- Grep the codebase for any `to="/...$..."` or sitemap entry built from a route pattern. Current `sitemap[.]xml.tsx` looks clean (it maps real slugs), so this is likely a historical leak Google still has cached. Confirm with one ripgrep pass.
- If nothing is found in source, the GSC entry is a ghost — just "Mark as fixed" / request re-validation; it won't reappear.

**4. GSC re-validation guidance** (no code) — once deployed, hit "Validate fix" in GSC for each of the 4 URLs. `/running-events/$slug` can also be dismissed as "Not a valid URL."

### Technical notes (for review)

- The `$slug` catch route uses `notFound()` for misses, not a generic 404 string, so it integrates with `__root.tsx`'s `notFoundComponent` — Google sees a real 404 status, which is what we want.
- Reserved-name guard inside the handler: a small `RESERVED_TOP_LEVEL` set (`events`, `running-events`, `parkrun-events`, `junior-parkrun-events`, `5k-races`, `10k-races`, `half-marathons`, `marathons`, `ultra-marathons`, `trail-running-events`, `list-your-event`, `privacy`, `admin`, `api`, `lovable`, `email`, `sitemap.xml`, `robots.txt`, `favicon.ico`, `index.html`). If the segment is reserved, return `notFound()` immediately — never redirect.
- DB lookup uses the existing `events.functions.ts` server-fn layer (or a small new `lookupEventSlug` fn) so it goes through the same Supabase client + RLS path as everything else. Indexed on `slug` (already the case).
- No new tables, no migration. Pure routing.

### Out of scope (deliberately)

- Building 301s for arbitrary historical URL shapes we have no evidence of. Only the patterns GSC actually shows us.
- Touching the sitemap generator itself unless the audit finds a real bug.

### After this, we resume the Phase 2 plan (Admin data browser).
