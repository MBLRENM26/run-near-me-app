## P0 Search — Plan

Single sprint. Two surfaces (search + past-event state) plus search analytics from day one.

---

### 1. Database (one migration)

**`events`**
- Add generated `tsv tsvector` column from `name`, `town`, `county` (weighted A/B/C). Stored, not virtual — so we can `GIN` index it.
- `CREATE INDEX events_tsv_gin_idx ON events USING gin(tsv)`.
- Backfill is automatic via generated column.

**`search_logs`** (new)
```
id            uuid pk
query         text not null
results_count int  not null
created_at    timestamptz default now()
ip_hash       text         -- sha256(ip + daily salt), for rough rate-limit only
user_agent    text
```
GRANTs: `INSERT TO anon, authenticated`; `SELECT, ALL TO service_role`. No `SELECT` to anon. RLS enabled, no policies (admin reads via `supabaseAdmin`).

**`search_clicks`** (new)
```
id              uuid pk
search_log_id   uuid references search_logs(id) on delete cascade
clicked_slug    text not null
position        int           -- rank of clicked result (1-based)
created_at      timestamptz default now()
```
Same GRANT/RLS shape.

Indexes: `search_logs(created_at desc)`, `search_logs(query)`, `search_clicks(search_log_id)`.

---

### 2. Search backend

**`searchEvents` serverFn** (`src/lib/search.functions.ts`)
- Input: `{ q: string, limit?: number }` — Zod validated, `q` trimmed, max 80 chars.
- Query: `tsv @@ websearch_to_tsquery('english', $1)` against `events` WHERE `status='ACTIVE' AND duplicate_of IS NULL AND (sort_date IS NULL OR sort_date >= today - 14)` (small grace window for very-recently-past events so they're still findable).
- Order: `ts_rank(tsv, query) desc, is_featured desc, sort_date asc`.
- Returns canonical public DTO only (slug, name, town, county, sort_date, distances, is_featured, date_is_estimated). Never includes `source` / `source_url`. Past events flagged with `is_past: boolean` for badge rendering in results.
- Hard limit 20.

**Postcode detection** (`src/lib/postcode.ts`)
- Regex: `/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i` (full UK postcode, case/space-insensitive).
- If input matches → search page short-circuits before query, geocodes via existing geocoder, and `navigate({ to: "/", search: { lat, lng, label: postcode } })`. No `/search` results render for postcodes — homepage nearby UI owns that surface.

---

### 3. `/search?q=...` route

`src/routes/search.tsx`
- `validateSearch`: `{ q: fallback(z.string().trim().max(80), "").default("") }`.
- `loaderDeps`: `{ q }`. Loader calls `searchEvents` on the server.
- Component: postcode check on mount → redirect if matched; otherwise renders results.
- `head()`: `<meta name="robots" content="noindex, follow">`, title `"Search: {q} — Running Events Near Me"`, no description (search results page).
- States: empty `q`, no results (logged as zero-result, friendly message + "Browse by distance/region" links), results list, postcode-redirecting spinner.
- Each result item is a `<Link>` to `/events/{slug}` with an `onClick` that fires-and-forgets `fetch('/api/public/track-search-click', ...)` with `{ search_log_id, clicked_slug, position }`.

---

### 4. Search analytics endpoints

**`POST /api/public/track-search`** (`src/routes/api/public/track-search.ts`)
- Zod-validated body: `{ q: string (1-80), results_count: int (0-100) }`.
- Loads `supabaseAdmin` inside handler; inserts row; returns `{ search_log_id }`.
- Simple in-memory IP-hash rate cap: max 30/min per ip_hash (best effort; not auth).
- CORS: same-origin only (no `*`).

**`POST /api/public/track-search-click`** (`src/routes/api/public/track-search-click.ts`)
- Body: `{ search_log_id: uuid, clicked_slug: string (1-200), position: int (1-50) }`.
- Inserts into `search_clicks`. Returns `{ ok: true }`.

The `searchEvents` serverFn does NOT log searches itself — logging happens client-side from the search page after results render, so SSR/prerender hits and bot crawls (which 404-friendly noindex respects but don't always honour) don't pollute the data. Client-side fetch from a useEffect that runs once per `q` change.

---

### 5. Header search input

`src/components/site/HeaderSearch.tsx` (new)
- Controlled input + submit → `navigate({ to: '/search', search: { q } })`.
- Mobile: collapses to icon → expands inline.

`Header.tsx`: read pathname via `useRouterState`; render `<HeaderSearch />` when `pathname !== "/"`. On `/` the existing hero owns search affordance (out of scope to add hero search — explicitly per spec: "No second input on the homepage itself").

---

### 6. Past Event State

`src/routes/events.$slug.tsx`
- Already has `sort_date`. Derive `isPast = sort_date && sort_date < today`.
- UI: small muted pill `Took place {formatDate(sort_date)}` next to the date block. No banner.
- Hide the "Enter now" / entry CTA when `isPast`. Keep organiser website link (already trust-classified).
- `head()` description: if `isPast`, prepend `"Took place {date}. "` and drop any "how to enter" language. Mirror in `og:description`.
- JSON-LD: leave `Event` schema in place; Google handles past events fine. Don't add `eventStatus: "EventScheduled"` claims that contradict the date.

No DB changes for past state — it's a render-time derivation.

---

### 7. Admin: top queries view

`src/routes/_adminShell.admin.search.tsx`
- ServerFn `getSearchAnalytics({ days })` (default 30) using `supabaseAdmin`:
  - Top 50 queries by count.
  - Top 50 zero-result queries.
  - Click-through rate per query (joins `search_clicks`).
- Two simple tables, no charts. Date-range selector (7/30/90 days).
- Link added to admin nav.
- No CSV export this sprint (open data model; `query, count, ctr, zero_result_count` shape is CSV-ready when needed).

---

### 8. SEO plumbing

**`src/routes/sitemap[.]xml.tsx`** — no change needed (already only emits whitelisted routes; `/search` was never there).

**`src/routes/robots[.]txt.tsx`** — add `Disallow: /search` line.

**`/search`** — `noindex, follow` in `head()` covers everything Google does even if it ignores robots.

---

### 9. Verification checklist before shipping

1. Search "Ashford Striders" → only the canonical Charing 10K row appears (no duplicates). `duplicate_of IS NULL` filter doing its job.
2. Search "Ilkley", "10k Manchester", "trail" → relevant hits ordered sensibly.
3. Enter `BD9 4HD` in any search input → redirected to `/?lat=…&lng=…&label=BD9+4HD` with nearby events showing.
4. Click any result → row appears in `search_clicks` with correct `search_log_id`.
5. Search a nonsense string → zero-results page renders AND a row lands in `search_logs` with `results_count = 0`.
6. `curl /robots.txt` shows `Disallow: /search`. `curl /sitemap.xml | grep search` returns nothing.
7. `view-source:/search?q=foo` contains `<meta name="robots" content="noindex, follow">`.
8. Visit any past event (`sort_date < today`): pill shows, entry CTA gone, organiser link still present, meta description starts with "Took place".
9. Visit any future event: unchanged.
10. Header on `/about`, `/events/...`, `/search` shows search input; header on `/` does not.
11. `/admin/search` lists top queries and zero-result queries for the last 30 days.

---

### Out of scope (locked)
- Per-spec: auth, organiser claims, email digests, CSV export UI, title-tag changes, new scrapers, anything else.
- Power of 10 results link (parked — see `mem://backlog/po10-results-link`).
- Search suggestions/autocomplete dropdown. The header input submits to `/search`; no live dropdown. (Easy v2 once we have query data.)
- Trigram fuzzy matching. tsvector handles word stems and typos via `websearch_to_tsquery`; we'll add `pg_trgm` later only if zero-result analytics show real typo demand.

---

### Rough order of work
1. Migration (tsv column + index, two log tables, GRANTs).
2. `searchEvents` serverFn + postcode helper.
3. `/search` route + result rendering.
4. Two `/api/public/track-search*` endpoints.
5. Wire client-side logging from `/search`.
6. `HeaderSearch` component + conditional render in `Header`.
7. Past-event derivation + UI/meta tweaks on `events.$slug.tsx`.
8. `/admin/search` view.
9. `robots.txt` update.
10. Run the 11-point verification list.
