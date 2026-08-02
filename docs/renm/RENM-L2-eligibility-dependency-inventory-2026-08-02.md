# RENM L2 — Read-only eligibility dependency inventory

Date: 2 August 2026
Package: L2 (investigation and reconciliation only — no implementation)
Status: draft for Mike's review

Evidence labels used throughout: **[SF]** sourced fact (named reproducible source),
**[OE]** observed evidence (directly observed, with method and limits),
**[INF]** inference or proposal (to test, never restated as fact).

---

## 1. Baseline and method

### Commits and deployment

- **[SF]** Declared production baseline in the operating kernel: `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`.
- **[OE]** Repository head inspected for this audit: `373cb8882846f708dbb84ef7ce62c7b004cba21f` (`git rev-parse HEAD`, working tree clean before the report was written).
- **[OE]** The inspected head is **not** the declared production baseline. Deployment state was not independently observable from inside this environment; no build, publish or deploy was performed. All code statements below therefore describe the inspected head, not necessarily what production is serving.
- **Unresolved:** the delta between `c1cdc4a…` and `373cb88…` was not enumerated (out of scope, and the L2 permission set does not allow altering repository state to compare builds). Mike should confirm which commit production currently serves before any L3/L4 implementation prompt is issued.

### Database access

- **[OE]** Role used: `sandbox_exec` via managed `psql`, read-only. Only `SELECT` and catalogue reads (`pg_proc`, `pg_get_functiondef`) were issued. No DDL, no DML, no RPC that mutates, no job or grant change, no sender or ingestion call.
- **[OE]** Server clock at the time of counting: `2026-08-02 13:41:10 UTC`, `current_date = 2026-08-02`.
- **[OE]** Schema/migration identifiers were not read; the audit relies on live catalogue definitions rather than migration filenames.

### Repository search method

Commands run from the repository root (`rg` = ripgrep):

```
rg -n '"status"|status.*ACTIVE|ACTIVE' src --glob '!routeTree.gen.ts' --glob '!src/integrations/supabase/types.ts'
rg -n 'sort_date' src --glob '!routeTree.gen.ts' --glob '!src/integrations/supabase/types.ts'
rg -n 'duplicate_of' src --glob '!src/integrations/supabase/types.ts'
rg -n 'from\("events"\)' -A14 src
rg -n 'hasDiscoverableLink|hasOrganiserOwnedLink|classifyEventLink' src
rg -n 'robots|noindex|canonical' src/routes src/components
rg -n 'events_within_radius|search_events_v1|search_clubs_v1' src
rg -l 'describe\(' src
```

Dynamic and string-composed predicates were specifically searched for, because
several filters are assembled as PostgREST `.or(...)` strings rather than typed
calls — notably the template literal `` `sort_date.gte.${today},sort_date.is.null` ``
and the shared constant `UK_BOUNDS_OR_NULL`. Both were traced to every call
site. SQL-side predicates were read from live function definitions rather than
inferred from the client code.

### Gate reproduction method

Because two of the strongest gates (`hasDiscoverableLink`, `computeIndexability`)
are TypeScript, not SQL, exact membership cannot be produced by SQL alone.
Method used **[OE]**:

1. Export the required columns for all `status='ACTIVE'` rows to TSV via `psql` (read-only `COPY`-equivalent `SELECT`).
2. Execute the *unmodified* project modules `src/lib/link-trust.ts` and `src/lib/event-indexability.ts` against that export in a scratch script under `/tmp` (not committed).
3. Count and sample memberships.

This reproduces the deployed logic exactly for the gate functions, but does not
reproduce per-surface geography, distance-tag or month windows, which are noted
as approximations where they apply.

### Limitations and unresolved coverage

- **[OE]** Distance-tag matching (`rowMatchesDistanceKey`) and city haversine
  filters were not replayed; per-distance and per-city membership counts in
  section 4 are therefore stated as "not reproduced" rather than estimated.
- **[OE]** The rendered `/sitemap.xml` was not fetched; the event-URL count is
  computed from the same functions the route calls.
- **[OE]** Cloudflare/edge cache behaviour beyond declared `Cache-Control`
  headers was not observed.
- **[OE]** Analytics-side "what Google actually indexed" was not consulted; this
  is a code-and-data audit, not a GSC reconciliation.

---

## 2. Surface and query matrix

Shared building blocks referenced repeatedly below:

| Symbol | File | Meaning |
| --- | --- | --- |
| `FUTURE_OR_NULL` | inline template literal | `` `sort_date.gte.${today},sort_date.is.null` `` — future **or undated** rows pass |
| `UK_BOUNDS_OR_NULL` | `src/lib/events-query.ts` | `lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)` |
| `DISCOVERY_EVENT_COLUMNS` | `src/lib/events-query.ts` | canonical public column list; excludes `source`, `source_url` |
| `hasDiscoverableLink` | `src/lib/link-trust.ts` | organiser-owned link **or** (trusted governance **and** an event-specific link) |
| `hasOrganiserOwnedLink` | `src/lib/link-trust.ts` | strictly organiser-owned link; entry platforms rejected |
| `computeIndexability` | `src/lib/event-indexability.ts` | past / slug-suffix-duplicate / orphan / duplicate-sibling → noindex |

`today` is always `new Date().toISOString().slice(0,10)` — **UTC**, not
Europe/London. **[SF]** No `Europe/London` handling exists anywhere in the
event-eligibility path (`rg -n 'Europe/London|timeZone' src` returns no
eligibility hits).

### 2.1 Counts and headline numbers

| Field | Value |
| --- | --- |
| Route/purpose | Homepage live event counter ("N events") |
| File/function | `src/lib/stats.functions.ts` → `getLiveStats`; rendered by `src/components/home/LiveEventCounter.tsx` |
| Caller/runtime, auth role | server function, SSR + client refetch; **server publishable (anon RLS) client**, not admin |
| Source object | `public.events` |
| Current predicate | `status='ACTIVE' AND duplicate_of IS NULL` |
| Date/timezone | **none** — past and undated rows are counted |
| Canonical/duplicate | `duplicate_of IS NULL` only; `status='DUPLICATE'` rows are implicitly excluded by the status filter |
| Test/cancelled/terminal | no treatment |
| Count semantics | `count: 'exact', head: true` — a true DB count, not a page total |
| Sitemap/index/direct page | n/a |
| Cache/build | `refetchInterval` 60 s, `staleTime` 30 s (client) |
| Tests | none |
| Confirmed | **[OE]** 5,368 rows match at 2026-08-02 13:41 UTC |
| Unresolved | **[INF]** the headline number is a *stored/active* count, not a *discoverable* count; the site presents it next to discovery copy |

### 2.2 Homepage discovery blocks

| Field | Nearby (radius) | Curated "upcoming" |
| --- | --- | --- |
| Route/purpose | `/` proximity list, parkrun split, featured | `/` quality-curated strip |
| File/function | `src/routes/index.tsx` → `supabase.rpc('events_within_radius')` | `src/routes/index.tsx` inline `supabase.from('events')` |
| Caller/runtime, role | **browser client, anon role** | **browser client, anon role** |
| Source object | SQL fn `public.events_within_radius` | `public.events` |
| Current predicate | `lat/lng NOT NULL AND status='ACTIVE' AND (sort_date IS NULL OR sort_date >= CURRENT_DATE)` + bbox + haversine ≤ radius, `LIMIT least(max,500)` | `status='ACTIVE' AND date_is_estimated=false AND sort_date BETWEEN today+30d AND today+120d AND lat/lng NOT NULL AND UK_BOUNDS_OR_NULL AND town/county/distances NOT NULL AND distances<>'' AND name NOT ILIKE '%parkrun%'`, ordered featured-first, `LIMIT 20` then sliced to 9 |
| Date/timezone | `CURRENT_DATE` — **database timezone**, not the JS UTC string used elsewhere | UTC JS date arithmetic |
| Canonical/duplicate | **no `duplicate_of` filter** | **no `duplicate_of` filter** |
| Test/cancelled/terminal | none | none |
| Then filtered in JS | `hasDiscoverableLink` | `hasDiscoverableLink` |
| Count semantics | list length after filters; no total shown | fixed 9 |
| Sitemap/index | n/a (homepage indexed) | n/a |
| Cache/build | TanStack Query default | TanStack Query default |
| Tests | none | none |
| Unresolved | **[INF]** `CURRENT_DATE` vs JS-UTC `today` is a second timezone authority; the two can disagree for a single day boundary window |

### 2.3 Region, county, city, distance, region×distance, terrain, taxonomy, month, weekend

All share the same skeleton: `status='ACTIVE'` + a scope filter +
`FUTURE_OR_NULL` (except weekend/month, which bound `sort_date` explicitly) +
`UK_BOUNDS_OR_NULL` (except city) + JS `hasDiscoverableLink`.

| Surface | File / function | Runtime & role | Scope predicate | Date treatment | UK bounds | Link gate | Count semantics | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Region page `/running-events/$slug` | `src/routes/running-events.$slug.tsx` inline query | **browser client, anon role** | `region = <name>` | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | filtered list length | only discovery surface still executing in the browser |
| County `/running-events-in/$county` | `src/lib/county.functions.ts` → `getEventsForCounty` | server fn, **admin client** | `county IN (dbNames)` | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | `total = events.length` | county registry gate ≈25 active events (`src/lib/counties.ts`) |
| City `/running-events-in-city/$city` | `src/lib/city.functions.ts` → `getEventsForCity` | server fn, admin | lat/lng bbox + haversine ≤ `CITY_RADIUS_KM` | `FUTURE_OR_NULL` | **no** (bbox implies it) | `hasDiscoverableLink` | `total`, page suppressed below `CITY_MIN_EVENTS = 10` | requires coordinates → undated-but-geocoded rows pass, ungeocoded rows never do |
| Distance `/5k-races` etc. | `src/lib/events.functions.ts` → `getEventsByDistance` | server fn, admin | tag match, legacy substring fallback | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | `total` = full matched set; `events` capped at `DISPLAY_LIMIT = 500` | **total ≠ rendered count** |
| Region × distance | `getEventsByRegionAndDistance` | server fn, admin | region + tag match | `FUTURE_OR_NULL` | yes | gate applied **before** `otherDistanceCounts` | `total` = matched; display capped 500 | deliberate: panel counts match click-through |
| Matrix (sitemap driver) | `getRegionDistanceMatrix` | server fn, admin | `region NOT NULL` | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | per-cell totals; sitemap includes cells with `total >= 3` | |
| Terrain `/road-races`, `/fell-races`, `/multi-terrain-races` | `src/lib/terrain.functions.ts` | server fn, admin | `terrain_tags @> [tag]` | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | `total`; display capped 500 | |
| Taxonomy (governance / organiser_type) | `getEventsByTaxonomy` | server fn, admin | `<field> = <value>` | `FUTURE_OR_NULL` | yes | `hasDiscoverableLink` | `total` used in meta description text | route ships only when curated count clears ~20 (config comment, not code) |
| Month `/running-events/{month}`, `/{distance}/{month}` | `src/lib/month-page.functions.ts` → `getEventsForMonth` | server fn, admin | `sort_date BETWEEN month bounds` | **explicit range — undated rows excluded** | yes | `hasDiscoverableLink` | `total` | |
| Month matrix (sitemap driver) | `getMonthPageMatrix` | server fn, admin | rolling 12-month `sort_date` window | explicit range | yes | `hasDiscoverableLink` | per month/distance totals; sitemap gate `total >= 3` | |
| Weekend `/running-events-this-weekend`, `/…next-weekend` | `src/lib/weekend.functions.ts` | server fn, admin | `sort_date BETWEEN sat AND sun` | explicit range; **undated excluded** | yes | `hasDiscoverableLink` | `total`; hard `LIMIT 1000` | |
| "Other races near you" / same-town / related | `getEventPageData` in `src/lib/events.functions.ts` | server fn, admin | region + distance, or `events_within_radius` at 25/75/200 mi, or `ilike(town)` `LIMIT 50` | `FUTURE_OR_NULL` (region/town) / `CURRENT_DATE` (RPC) | region & related yes; same-town **no** | `hasDiscoverableLink`, current event exempted | `totalCount` region+distance scoped even when the displayed six come from the radius RPC | **[OE]** deliberate per code comment, but the displayed set and the count can describe different populations |

No route in this group has automated test coverage. **[OE]** `rg -l 'describe\('`
returns only `admin-subscriptions.core.test.ts`, `admin-unseen-counts.test.ts`,
`reminder-gate.test.ts`, `sync-scottish-athletics-plan.test.ts`. **There is no
test anywhere covering discovery eligibility, indexability, or the link gate.**

### 2.4 Search

| Field | Value |
| --- | --- |
| Route/purpose | `/search`, header search |
| File/function | `src/lib/search.functions.ts` → `searchEvents` → SQL `public.search_events_v1` |
| Runtime/role | server fn, admin client calling a `STABLE` SQL function |
| Predicate **[SF]** (live definition) | `status='ACTIVE' AND duplicate_of IS NULL AND tsv @@ websearch_to_tsquery(...) AND (sort_date IS NULL OR sort_date >= CURRENT_DATE)`, `LIMIT GREATEST(1, LEAST(lim,50))` |
| Date/timezone | `CURRENT_DATE` (DB timezone) |
| Canonical/duplicate | **the only public surface that filters `duplicate_of IS NULL`** besides the headline count |
| Link gate | **none** — search returns events the landing pages suppress |
| UK bounds | none |
| Index behaviour | `/search` emits `robots: noindex, follow` and is `Disallow`ed in `robots.txt` |
| Count semantics | result-list length only |
| Unresolved | **[INF]** search is intentionally broader than discovery (a user typing a name should find it), but this is not written down anywhere in code or contract |

### 2.5 Agent / LLM-facing routes (MCP)

| Field | `search_events` | `get_event` |
| --- | --- | --- |
| File | `src/lib/mcp/tools/search-events.ts` | `src/lib/mcp/tools/get-event.ts` |
| Predicate | `status='ACTIVE' AND sort_date >= today` (+ optional month window), over-fetch ×3 | `status='ACTIVE' AND slug = …` |
| Date | JS UTC `today`; **`.gte` — undated rows are excluded** | none |
| Link gate | **`hasOrganiserOwnedLink`** — stricter than the website's `hasDiscoverableLink` | none |
| Canonical/duplicate | none | none |
| Output hygiene | internal `id`/`status` stripped, `canonical_url` added | same |
| Unresolved | **[OE]** agents see a smaller and differently-shaped catalogue than the website: no undated parkruns, no governance-trusted entry-platform events | |

### 2.6 Sitemap, robots, canonical, index/noindex

| Field | Value |
| --- | --- |
| File | `src/routes/sitemap[.]xml.tsx`; event slugs from `getIndexableEventSlugsForSitemap` (`src/lib/events.functions.ts`) |
| Event predicate | `status='ACTIVE' AND slug IS NOT NULL AND FUTURE_OR_NULL`, then `computeIndexability` per row with siblings grouped by `normaliseEventName` |
| Exclusion reasons | `past`, `slug-suffix-duplicate` (`-race-N$`), `orphan` (no entry url, no organiser url, no organiser name), `duplicate-sibling` (≥2 same normalised name and not the earliest future instance) |
| **Link gate** | **none** — the sitemap ignores `hasDiscoverableLink` entirely |
| UK bounds | **none** |
| `duplicate_of` | **not consulted** |
| `lastmod` | `sort_date` when in the past, otherwise clamped to today — i.e. a generation-time fallback for every future event **[OE]** |
| Other sections | static pages, distance pages, weekend, terrain, taxonomy, counties (all of `COUNTIES`), cities with `total >= CITY_MIN_EVENTS`, parkrun hub + all parkrun slugs, all regions, region×distance cells with `total >= 3`, all club slugs, month URLs in the next 12 months with `total >= 3` |
| Failure mode | each block is wrapped in `try/catch` and silently drops to empty on error, logging to console — **a partial sitemap can be served as if complete** |
| Cache | `Cache-Control: public, max-age=3600` |
| robots.txt | `src/routes/robots[.]txt.tsx`: `Allow: /`, `Disallow: /admin/`, `Disallow: /search`, `Sitemap: {SITE_URL}/sitemap.xml`, cached 1 h |
| Per-page robots | `/events/$slug` sets `noindex, follow` when `computeIndexability(...).indexable === false`, and also for the 410 tombstone; canonical is always `${SITE_URL}/events/${slug}` |
| Header side effects | `src/lib/event-response-headers.ts` (`createServerOnlyFn`) sets `X-Status-Override: 410` and/or `X-Robots-Tag: noindex`, translated by `src/server.ts` |
| Tests | none |

### 2.7 Direct occurrence-page routing

| Field | Value |
| --- | --- |
| File | `src/lib/events.functions.ts` → `getEventPageData`; route `src/routes/events.$slug.tsx` |
| Statuses admitted to the query | `ACTIVE`, `DUPLICATE`, `HIDDEN` — **`EXPIRED` and `ARCHIVED` are not selected at all → 404** |
| `DUPLICATE` + `duplicate_of` → ACTIVE survivor | **301** to the survivor slug |
| `DUPLICATE` without a resolvable ACTIVE survivor | **404** (documented as reversible) |
| `HIDDEN` | **404** (233 legacy rows; no code path assigns this status) |
| `ACTIVE` with `sort_date` older than 90 days | **410 Gone** sentinel + `X-Robots-Tag: noindex` tombstone |
| `ACTIVE` past but within 90 days | **200**, page renders, `noindex` via the `past` indexability reason |
| `ACTIVE` undated | **200**, indexable subject to the other three reasons |
| Legacy flat URL `/{slug}` | `src/routes/$slug.tsx` → `lookupEventSlug` requires `status='ACTIVE' AND FUTURE_OR_NULL`, then **301** to `/events/{slug}`; otherwise 404. Past events therefore 404 at the flat URL while still returning 200 at the canonical URL |
| Parkrun detail `/parkrun-events/$slug` | `src/lib/parkrun.functions.ts`: `ACTIVE AND name ILIKE '%parkrun%' AND slug NOT NULL`, with a `DUPLICATE`→survivor 301 fallback; nearby races use **`hasOrganiserOwnedLink`** and `.gte(sort_date, today)` |
| Link gate | **none on the detail page** — by design; CTAs use `classifyEventLink`/`isTrustedLink` so "Enter now → sientries" still works |
| Tests | none |

### 2.8 Public server endpoints

| Route | Eligibility relevance |
| --- | --- |
| `/api/public/admin/indexability-stats` | Recomputes `computeIndexability` over **all** ACTIVE rows including past; secret-gated by `IMPORT_SECRET`. **[OE]** shares the sitemap's grouping logic but duplicates it rather than importing the sitemap query — a drift surface |
| `/api/public/track-search`, `/track-search-click` | analytics writes only; no eligibility |
| `/api/public/hooks/send-race-reminders` | fail-closed 503 (out of L2 scope; not invoked) |
| `/mcp`, `/.mcp/*` | see 2.5 |
| `/email/unsubscribe` | no eligibility |

### 2.9 Admin/shared paths whose logic is reused publicly

- **[OE]** `src/lib/event-indexability.ts` is shared by the sitemap, the event page `head()`, and the admin indexability-stats endpoint — a genuine single source of truth for *indexing*.
- **[OE]** `src/lib/link-trust.ts` is shared by every discovery surface — a genuine single source of truth for *link trust*.
- **[OE]** There is **no** shared source of truth for *status + date + canonical* eligibility. That predicate is re-typed at roughly 15 call sites, in three variants (`FUTURE_OR_NULL`, explicit `sort_date` range, `.gte(sort_date, today)`), across two timezone authorities (JS UTC string vs SQL `CURRENT_DATE`).
- **[OE]** Admin merge/unmerge (`src/lib/admin-events.functions.ts`) is the only writer of `DUPLICATE`/`duplicate_of`; it enforces "survivor must be ACTIVE". Admin submission approval creates rows as `EXPIRED` (draft) so they are invisible until flipped to `ACTIVE`.

### 2.10 Caches, loaders, build-time generation

- **[OE]** No build-time prerender of event pages, no ISR/revalidation. Everything is request-time SSR plus TanStack Query on the client.
- **[OE]** Declared caches: sitemap 1 h, robots 1 h, live stats 30 s stale / 60 s refetch. No other `Cache-Control` on eligibility-bearing routes.
- **[OE]** Edge/CDN caching was not observed and is unresolved.

---

## 3. Current disagreements

### 3.1 Intentional differences (documented in code)

1. **Detail page has no link gate; discovery surfaces do.** **[SF]** Stated in `link-trust.ts` and in project memory. A record whose only link is on an entry platform is directly reachable and can show "Enter now", but is not recommended.
2. **`/search` is broader than discovery.** No link gate, and `/search` is `noindex` + `Disallow`ed, so it cannot leak into the index.
3. **Legacy flat `/{slug}` refuses past events while `/events/{slug}` serves them.** **[SF]** Commented rationale: avoid feeding soft-404 candidates back into the crawl queue.
4. **`related.totalCount` stays region+distance scoped while the six displayed cards may come from the radius RPC.** **[SF]** Explicitly commented.
5. **Region×distance panel counts are computed after the trust gate** so the counts match click-through. **[SF]** Explicitly commented.

### 3.2 Defects and contradictions

1. **The headline count is not a discovery count.** `getLiveStats` counts `ACTIVE AND duplicate_of IS NULL` with **no date filter and no link gate**: 5,368 at audit time, against 2,528 events that any discovery surface would actually show. Past events (2,428 ACTIVE rows) are counted. **[OE]**
2. **The sitemap ignores the link gate.** 360 slugs are sitemap-eligible but excluded from every discovery surface **[OE]**. Google is asked to index pages the site itself will not recommend or link to from any hub — a thin-content and orphan-page risk.
3. **The discovery gate and the index gate disagree in both directions.** 182 events are discoverable but absent from the sitemap (mostly `duplicate-sibling`), 360 are in the sitemap but not discoverable. **[OE]**
4. **Two timezone authorities.** JS `new Date().toISOString().slice(0,10)` (UTC) in application code vs `CURRENT_DATE` inside `events_within_radius` and `search_events_v1`. **[OE]** Neither is Europe/London, so around midnight BST a UK "today" race can already be treated as past by both, and the two can disagree with each other at the UTC boundary.
5. **`duplicate_of` is almost universally ignored.** Only `getLiveStats` and `search_events_v1` filter it. **[OE]** 38 rows are `status='ACTIVE'` **and** `duplicate_of IS NOT NULL`; all are excluded from the headline count and from search, all are directly reachable, and **22 of them currently pass discovery** on landing pages (the other 16 are held back by the link gate or by being past). Example: `east-grinstead-10k-andy-ripley-memorial-2025` (`0333ad39-…`), discoverable = true, in sitemap = false (`duplicate-sibling`), counted = false.
6. **No test-record quarantine of any kind.** **[OE]** `test-tra` (`14836184-…`, "Test", 2027-01-01) and `test3-tra` (`92ec1a51-…`, "TEST3", 2027-01-24) are ACTIVE, future, pass the link gate, pass indexability, and are therefore **discoverable, countable, sitemap-eligible and directly reachable**.
7. **No cancelled/postponed treatment.** **[OE]** `down-by-the-river-races-event-cancelled` (`c0b99642-…`, "Down by The River Races (EVENT CANCELLED)", 2026-08-02) is discoverable **and** sitemap-eligible today. The only signal that it is cancelled is free text inside the event name. Two postponed events exist but happen to be past.
8. **Sitemap blocks fail open, silently.** Each `try/catch` logs and continues with an empty array, so a transient DB failure yields a structurally valid sitemap missing thousands of URLs, with no alert.
9. **`indexability-stats` duplicates rather than reuses the sitemap query.** Same rules, separate code path — guaranteed to drift.
10. **The region page is the last discovery surface running in the browser under the anon role.** Every sibling surface (county, city, distance, terrain, month, weekend, taxonomy) moved to server functions using the admin client. This is the direct overlap with L1.
11. **`ARCHIVED` is an undocumented status.** One row exists (`3be0bfe0-…`, name "TEST", no slug). No code path reads or writes it; it 404s only because it is not in the admitted status list.
12. **`is_upcoming` column exists and is unused by any eligibility path.** **[OE]** No `rg` hit outside generated types — a stale alternative date-state field.

### 3.3 Unclassified differences (need a Mike decision)

- **Undated events are included by `FUTURE_OR_NULL` but excluded by every explicit range surface.** 1,389 ACTIVE rows are undated; 1,384 of them are parkruns (genuinely recurring, no single date) and 5 are series parents such as `babcock-10k-series-dumbarton-dumbarton` and `let-s-do-this-london-10k-series-london`. **[OE]** Whether the 5 non-parkrun undated rows should be discoverable is not decided anywhere.
- **`EXPIRED` (327 rows) 404s.** It is used both as "admin draft, not yet published" and, by name, as "expired". Two meanings, one value.
- **`HIDDEN` (233 rows) 404s** with no writer — carried over from the earlier remediation.
- **The 90-day 410 cutoff** makes "past" mean two different things: 0–90 days past = 200 + noindex; >90 days = 410. Whether that matches the contract's terminal-evidence rule ("410 needs affirmative terminal evidence") is unresolved — a race merely being old is not affirmative terminal evidence.

---

## 4. Reproducible current-state counts

All database counts taken at **2026-08-02 13:41:10 UTC**, `current_date = 2026-08-02`, role `sandbox_exec`, read-only.

### 4.1 Stored

```sql
SELECT status, count(*) FROM public.events GROUP BY 1 ORDER BY 2 DESC;
```

| status | count |
| --- | --- |
| ACTIVE | 5,406 |
| DUPLICATE | 1,418 |
| EXPIRED | 327 |
| HIDDEN | 233 |
| ARCHIVED | 1 |
| **total** | **7,385** |

```sql
SELECT count(*) total,
       count(*) FILTER (WHERE duplicate_of IS NULL) canonical,
       count(*) FILTER (WHERE duplicate_of IS NOT NULL) mapped
FROM public.events;
```

total 7,385 · canonical 5,904 · mapped 1,481.

### 4.2 Date state within ACTIVE

```sql
SELECT count(*) FILTER (WHERE sort_date >= current_date) future,
       count(*) FILTER (WHERE sort_date <  current_date) past,
       count(*) FILTER (WHERE sort_date IS NULL)         undated,
       count(*) FILTER (WHERE date_is_estimated)         estimated
FROM public.events WHERE status='ACTIVE';
```

future 1,589 · past 2,428 · undated 1,389 · estimated 293.
Of the 1,389 undated, **1,384 match `name ILIKE '%parkrun%'`** and 5 do not.

### 4.3 Reason flags (overlapping, not a partition)

```sql
SELECT count(*) FILTER (WHERE name ILIKE '%test%')      test_name,
       count(*) FILTER (WHERE name ILIKE '%cancel%')    cancelled_name,
       count(*) FILTER (WHERE name ILIKE '%postpon%')   postponed_name,
       count(*) FILTER (WHERE slug ~ '-race-[0-9]+$')   slug_suffix_dup
FROM public.events;
```

test-pattern suspects 6 · cancelled-in-name 1 · postponed-in-name 2 · slug-suffix duplicates 138.
These overlap with each other and with the status buckets; they are diagnostic flags, not memberships.

### 4.4 Unique memberships by state

```sql
SELECT
 count(*) FILTER (WHERE status='ACTIVE')                                                    active,
 count(*) FILTER (WHERE status='ACTIVE' AND duplicate_of IS NULL)                           homepage_count,
 count(*) FILTER (WHERE status='ACTIVE' AND (sort_date >= current_date OR sort_date IS NULL)) active_future_or_undated,
 count(*) FILTER (WHERE status='ACTIVE' AND (sort_date >= current_date OR sort_date IS NULL)
                   AND (lat IS NULL OR (lat BETWEEN 49.9 AND 60.9 AND lng BETWEEN -8.6 AND 1.8))) active_future_ukbounds,
 count(*) FILTER (WHERE status='ACTIVE' AND slug IS NOT NULL)                               active_with_slug,
 count(*) FILTER (WHERE status='ACTIVE' AND slug IS NOT NULL
                   AND (sort_date IS NULL OR sort_date >= current_date - 90))               directly_reachable_200,
 count(*) FILTER (WHERE status='ACTIVE' AND sort_date < current_date - 90)                  gone_410,
 count(*) FILTER (WHERE status='DUPLICATE' AND duplicate_of IS NOT NULL)                    dup_redirect_301,
 count(*) FILTER (WHERE status='DUPLICATE' AND duplicate_of IS NULL)                        dup_orphan_404,
 count(*) FILTER (WHERE status='HIDDEN')                                                    hidden_404
FROM public.events;
```

| Membership | Count |
| --- | --- |
| (1) stored | 7,385 |
| (1) stored, ACTIVE | 5,406 |
| (3) countable — homepage headline predicate | **5,368** |
| ACTIVE ∧ future-or-undated | 2,978 |
| ACTIVE ∧ future-or-undated ∧ UK-bounds-or-null | 2,972 |
| (4) discoverable — above **+ `hasDiscoverableLink`** | **2,528** |
| discoverable under the stricter MCP gate (`hasOrganiserOwnedLink`) | 2,385 |
| (5) sitemap-eligible event URLs | **2,706** |
| (6) directly reachable, HTTP 200 | **5,315** |
| directly reachable, HTTP 410 (ACTIVE, >90 d past) | 91 |
| directly reachable, HTTP 301 (DUPLICATE → survivor) | 1,418 |
| DUPLICATE orphan → 404 | 0 |
| HIDDEN → 404 | 233 |
| EXPIRED → 404 | 327 |
| ARCHIVED → 404 | 1 |
| (7) enterable now | **not derivable** — no destination-validity field exists (this is exactly the L6 gap) |

Gate memberships (rows 4/5) were produced by executing the unmodified project
modules against a read-only export; see §1. Exclusion reasons for the sitemap
computation, over the 2,978 ACTIVE future-or-undated slugged rows:

| Reason | Count |
| --- | --- |
| indexable (in sitemap) | 2,706 |
| `duplicate-sibling` | 209 |
| `orphan` | 32 |
| `slug-suffix-duplicate` | 31 |

Link-gate exclusions among ACTIVE future-or-undated rows: **450**.

### 4.5 Discovery by surface

**[OE]** Per-surface totals (per distance, per region, per city, per month) were
**not reproduced** — each requires replaying distance-tag matching, haversine or
month bucketing, and the L2 permission set does not justify running every server
function against production. What *is* reproduced is the shared upper bound:
**no discovery surface can exceed 2,528 events**, and each surface is that set
narrowed by its own scope filter. The sitemap's own thresholds
(`region×distance total >= 3`, `month total >= 3`, `city total >= CITY_MIN_EVENTS`)
are computed from that same 2,528-row population.

### 4.6 Double-counting note

Rows (1)–(6) above are memberships of the *same* 7,385 stored rows, not disjoint
buckets: an event can be simultaneously countable, discoverable, sitemap-eligible
and directly reachable. The reason flags in §4.3 overlap each other. No total in
this section should be summed with another.

---

## 5. Sampled membership evidence

No personal contact data, prospectability notes, secrets or raw provenance
(`source`, `source_url`) appear below.

### 5.1 Consistently included (countable + discoverable + sitemap + reachable)

`41cdfdeb-ebd6-4c58-b04a-0a6b43c43db8`, `e0fba811-34e6-42ab-bef6-27f0765ca32f`,
`bc42c1bc-ae0f-4983-8460-c27f602b4023`, `80941b22-9409-4ec8-809b-8cb149fd7872`,
`fab1a106-3188-4814-be5e-a410018f38cd`.

### 5.2 Sitemap-eligible but excluded from all discovery (360 rows)

Slugs: `christmas-pudding-dash`, `mobmatch26`,
`scare-bear-run-2026-wales-aberdare-2026`, `alf-shrubb-memorial-race`,
`beckbusters-10km-race`.
Affected surfaces: present in `/sitemap.xml` and served 200 with an indexable
`/events/{slug}`; absent from homepage, region, county, city, distance,
region×distance, terrain, taxonomy, month, weekend and related blocks.

### 5.3 Discoverable but excluded from the sitemap (182 rows)

Slugs: `atw-bedford-running-festival`, `the-fast-furious-5km-2026-09-18`,
`baltonsborough-5-mile-road-race-2`,
`east-grinstead-10k-andy-ripley-memorial-2025`, `flying-fox-10-2026`.
Predominant reason: `duplicate-sibling`.

### 5.4 Undated inclusions

Discoverable undated (via `FUTURE_OR_NULL`): `jubileebedford`, `swanley`,
`lanarkmoor`, `gloucesternorth`, `walthamcrossplayingfield-juniors` — all
parkruns. Non-parkrun undated ACTIVE rows (all 5):
`4a87d084-a95e-4ccc-bee9-c0357961340c` (Babcock 10K Series – Dumbarton),
`2006e3bc-e4b1-4183-a40f-1a6e6c274fde` (Babcock 10K Series – Shettleston),
`8f05ddd3-0b44-47ee-9331-2de113d10b48` (Salomon Skyline Scotland),
`ea60d4f7-e54f-4f51-90e7-5a6f0ca61e4f` (Let's Do This London 10K Series),
`b3d7ed6b-5758-412e-87ff-93adefa2eb90` (Babcock 10K Series – Helensburgh).
`let-s-do-this-london-10k-series-london` is **in the sitemap but not
discoverable** — probed directly.

### 5.5 Past inclusions

2,428 ACTIVE rows have `sort_date < current_date`. Of those, 91 exceed the
90-day cutoff and return 410; the remaining ~2,337 return 200 with
`noindex, follow`, are excluded from the sitemap and from all discovery, yet are
all counted in the 5,368 headline number.

### 5.6 Test-pattern suspects

| id | slug | name | status | sort_date | discoverable | sitemap |
| --- | --- | --- | --- | --- | --- | --- |
| `14836184-cc8d-4f8f-8671-c66b1c608bd8` | `test-tra` | Test | ACTIVE | 2027-01-01 | **yes** | **yes** |
| `92ec1a51-b176-4ded-8a05-70599c28c7c1` | `test3-tra` | TEST3 | ACTIVE | 2027-01-24 | **yes** | **yes** |
| `2e9a50f2-15e2-46dd-9efd-44b90470dae0` | `lotus-test-track-5k` | Lotus Test Track 5k | ACTIVE | 2026-06-12 | no (past) | no |
| `8f0273c7-af7f-4ba8-a6cf-146a325819e9` | `test-track-ten-races-2026` | Test Track Ten Races 2026 | ACTIVE | 2026-05-16 | no (past) | no |
| `19d4c014-8eac-4f17-baf4-f3ab642de124` | `test-track-10-mile-basildon-2026` | Test Track 10 Mile | EXPIRED | 2026-05-01 | no | no |
| `3be0bfe0-1a4e-4d04-a14d-6dd22baf3897` | (none) | TEST | ARCHIVED | null | no | no |

**[INF]** "Lotus Test Track 5k" and "Test Track 10 Mile" are almost certainly
genuine races at motor-racing test tracks, not test data. Any name-pattern
quarantine must be an explicit approved ID list, never a `%test%` match.

### 5.7 Cancelled / postponed

| id | slug | name | sort_date | discoverable | sitemap |
| --- | --- | --- | --- | --- | --- |
| `c0b99642-deae-4675-a777-0ac7712a036c` | `down-by-the-river-races-event-cancelled` | Down by The River Races (EVENT CANCELLED) | 2026-08-02 | **yes** | **yes** |
| `b19adcc3-de95-4629-870a-38fa77646a81` | `hardmoors-160-postponed` | Hardmoors 160 (Postponed) | 2026-05-29 | no (past) | no |
| `2dd6547e-88d6-4acd-bf11-4a8d73c19175` | `scarpa-great-lakeland-3day-postponed` | Scarpa Great Lakeland 3Day (Postponed) | 2026-05-02 | no (past) | no |

### 5.8 ACTIVE rows carrying a duplicate mapping (38 rows)

`0333ad39-bed9-452e-8147-5360d2e040dd` (`east-grinstead-10k-andy-ripley-memorial-2025`),
`15817343-861b-412f-b817-b5354adff65b` (`derwent-runners-4`),
`1f91dde0-028f-4de6-b9b2-1cf9648cfc16` (`acronyms-tamar-10k`),
`2244a8f7-29ab-4609-a513-53bef5d2e039` (`brighton-phoenix-10k-2026`),
`26006ae4-19bf-4665-b232-c04373d19c80` (`cannock-chase-half-marathon-10k`).
Excluded from the headline count and from `/search`; included in landing-page
discovery; directly reachable at 200.

### 5.9 Directly reachable but unsuitable for current discovery

The 233 `HIDDEN` and 327 `EXPIRED` rows are **not** reachable (404). The genuine
population in this category is the ~2,337 ACTIVE past-within-90-days rows plus
the 450 link-gate exclusions: reachable, sometimes indexable, never recommended.

---

## 6. Candidate interim predicate (proposal only — not implemented)

### `discovery_eligibility_v1` — plain rules

An event is **discovery-eligible** when **all** of the following hold:

1. `status = 'ACTIVE'`.
2. The occurrence is not in the past against a single declared UK boundary:
   either `sort_date IS NULL` (recurring/undated, admitted) **or**
   `sort_date >= uk_today()`.
3. `duplicate_of IS NULL` — it is the canonical record for its occurrence.
4. Coordinates are either absent or inside the UK mainland box
   (`lat IS NULL OR (lat BETWEEN 49.9 AND 60.9 AND lng BETWEEN -8.6 AND 1.8)`).
5. It is not in the approved quarantine list (test records; reviewed duplicate
   batches) — **L5 field, does not yet exist**.
6. It is not marked cancelled or terminal — **L6 field, does not yet exist**.
7. It passes `hasDiscoverableLink(entry_url, organiser_url, governance)`.

Rules 1–4 and 7 are implementable today. Rules 5–6 must be represented as
declared-unavailable, not invented.

**UK boundary, explicit:** `uk_today()` = the current date in `Europe/London`,
i.e. `(now() AT TIME ZONE 'Europe/London')::date`. This is a deliberate change
from both current authorities (JS UTC string and SQL `CURRENT_DATE`) and is the
single most consequential decision in this predicate — it must be Mike's call,
not an implementation detail.

### Illustrative SQL (not executed, not to be created as an object)

```sql
-- illustrative only
WITH uk AS (SELECT (now() AT TIME ZONE 'Europe/London')::date AS today)
SELECT e.id
FROM public.events e, uk
WHERE e.status = 'ACTIVE'
  AND (e.sort_date IS NULL OR e.sort_date >= uk.today)
  AND e.duplicate_of IS NULL
  AND (e.lat IS NULL OR (e.lat BETWEEN 49.9 AND 60.9 AND e.lng BETWEEN -8.6 AND 1.8))
  -- AND NOT e.is_quarantined      -- L5, field does not exist
  -- AND e.lifecycle <> 'cancelled' -- L6, field does not exist
;
-- link gate still applied in TypeScript: hasDiscoverableLink(...)
```

### Pseudocode for the application-side wrapper

```
function discoveryEligibleV1(row, ukToday):
    if row.status != 'ACTIVE':                  return exclude('status')
    if row.sort_date != null and row.sort_date < ukToday:
                                                return exclude('past')
    if row.duplicate_of != null:                return exclude('non-canonical')
    if row.lat != null and outsideUkBox(row):   return exclude('outside-uk')
    if quarantineIds.has(row.id):               return exclude('quarantined')      # L5
    if row.lifecycle in TERMINAL:               return exclude('terminal')         # L6
    if not hasDiscoverableLink(row):            return exclude('no-discoverable-link')
    return include
```

### Exclusion reason codes

`status`, `past`, `non-canonical`, `outside-uk`, `quarantined` (L5),
`terminal` (L6), `no-discoverable-link`.

### Assessment against the required dimensions

| Dimension | Assessment |
| --- | --- |
| Confirmed future date | Partially satisfiable. `sort_date` exists; `date_is_estimated` distinguishes estimated from confirmed but the predicate deliberately does **not** exclude estimated dates (293 rows) — the homepage curated strip already does that locally, and promoting it site-wide would be a behaviour change, not a reconciliation. |
| Canonical identity | Satisfiable now via `duplicate_of IS NULL`; adopting it removes 38 rows from discovery and aligns discovery with the headline count and search. |
| Existing discovery state | Rules 1, 2, 4, 7 reproduce today's landing-page behaviour almost exactly. |
| Cancellation / terminal | **Not satisfiable.** No field exists; the only signal is free text in `name`. Must remain a declared gap until L6. |
| Test quarantine | **Not satisfiable.** No field, no list. Must be an explicit approved ID list (L5), never a name pattern — see §5.6. |
| Reviewed duplicate treatment | Partially. `duplicate_of` covers admin-merged duplicates; `computeIndexability`'s `duplicate-sibling` heuristic is a separate, name-based notion that must not be folded in without review. |

### Direct-page / reference treatment

Kept **separate**. Nothing in this predicate should change what
`/events/{slug}` returns. A record excluded by `discovery_eligibility_v1`
remains stored and remains directly reachable exactly as today. Combining the
two is not supported by any evidence gathered here.

### Unresolved decisions inside the predicate

- Europe/London vs UTC vs `CURRENT_DATE` boundary (see above).
- Whether undated non-parkrun series parents (5 rows) stay discoverable.
- Whether `date_is_estimated` should gate discovery site-wide.
- Whether the sitemap adopts the same predicate or stays deliberately wider.

---

## 7. Affected-record preview (no mutation)

Comparison basis: current discovery membership (2,528) vs
`discovery_eligibility_v1` with rules 5 and 6 treated as no-ops (unavailable
fields), evaluated at 2026-08-02 13:41 UTC. Rule 3 (`duplicate_of IS NULL`) is
the only behavioural change; the UK-boundary change (Europe/London) does not
alter membership at this timestamp because 13:41 UTC and 13:41 BST fall on the
same calendar date — it will matter at the boundary, not in this snapshot.

| Bucket | Count | Notes |
| --- | --- | --- |
| Retained | 2,506 | unchanged membership |
| Newly included | 0 | the candidate is strictly narrower than current discovery |
| Newly excluded | 22 | the subset of the 38 `duplicate_of IS NOT NULL` ACTIVE rows that currently pass discovery |
| Current-only | 22 | same set as newly excluded |
| Candidate-only | 0 | — |
| Excluded by reason `non-canonical` | 22 | the other 16 of the 38 are already excluded by the link gate or by being past |
| Excluded by reason `quarantined` | unresolved | no field (L5) — expected ≥2 (`test-tra`, `test3-tra`) once an approved list exists |
| Excluded by reason `terminal` | unresolved | no field (L6) — expected ≥1 (`down-by-the-river-races-event-cancelled`) |
| Unresolved | ≥3 | the rows above, pending L5/L6 fields |

Sampled newly-excluded IDs (all currently discoverable):
`1f91dde0-028f-4de6-b9b2-1cf9648cfc16` (`acronyms-tamar-10k`),
`6d383442-548d-4078-a627-8f459065a6fe` (`aepg-great-eastern-run-2026`),
`ccd28d98-246f-41e4-ad8d-22ba53bb4d4a` (`banbury-10k`),
`ddc8a68e-9145-4087-be6e-670441052bda` (`chelmsford-marathon-half-marathon`),
`5ef55aa5-2f93-40ae-9c35-5389fc1438c8` (`crowborough-10k-5k`).

Affected surfaces if adopted: homepage nearby and curated strips, region, county,
city, distance, region×distance, terrain, taxonomy, month, weekend, related /
same-town / nearby blocks, and the region×distance and month sitemap thresholds
(a cell sitting on exactly 3 could drop below the threshold). **Not** affected:
`/events/{slug}` status codes, `/search` (already filters `duplicate_of`), the
headline count (already filters `duplicate_of`), MCP `get_event`.

**[INF]** Adopting rule 3 makes discovery, the headline count and search agree on
canonical identity for the first time. That is the single highest-value,
lowest-risk alignment available.

---

## 8. Dependency and implementation implications

### Overlap with L1

- L1 established that anonymous access can select 38 of 41 `events` columns.
  L2 identifies the two consumers that actually depend on that anon reach:
  `src/routes/running-events.$slug.tsx` (region page, direct `supabase.from('events')`)
  and `src/routes/index.tsx` (homepage nearby RPC + curated strip). **Every other
  discovery surface already runs server-side through the admin client.**
- **[INF]** Therefore the L3 projection's consumer-migration work is narrower than
  a whole-app refactor: migrating those two files removes the last public
  dependency on direct anon table reach for discovery. `events_within_radius`
  is a `STABLE SQL` function and would need its own projection-aware version or
  a grant decision.
- The `stats.functions.ts` publishable-client count also reads the base table
  server-side under the anon role and must be included in the L3 inventory.

### Prerequisites for L3 (safe projection)

1. Confirm which commit production serves.
2. Freeze the public column contract — `DISCOVERY_EVENT_COLUMNS` plus `lat`,
   `lng` (city/parkrun) is the observed superset; `organiser` is additionally
   required by the indexability rule and `duplicate_of`/`status` by the detail
   route, both of which are admin-side and must stay outside the public projection.
2. Decide whether the projection embeds eligibility (a filtered view) or stays a
   pure column boundary with eligibility applied above it. **[INF]** Pure column
   boundary first; embedding eligibility into the projection would silently
   change every surface at once and violates the additive-shadow rule.

### Prerequisites for L4 (one shared eligibility rule)

1. Mike's decision on the UK date boundary.
2. Mike's decision on canonical identity in discovery (the 38 rows).
3. Agreement that the sitemap either adopts or deliberately diverges from the
   discovery predicate, recorded as a decision either way.
4. A single owner module for the predicate, imported by every surface, replacing
   the ~15 hand-typed copies — and by `events_within_radius` and
   `search_events_v1`, which currently encode their own copies in SQL.

### Migration surfaces

`public.events` (no schema change required for L4 itself), the two SQL functions
above, `src/lib/events-query.ts` (natural home for a shared predicate),
`src/lib/link-trust.ts` (unchanged), `src/lib/event-indexability.ts` (unchanged
unless the sitemap is aligned), plus every call site listed in §2.3.

### Required tests and fixtures

There are currently **zero** tests over eligibility. Minimum before any L4
change ships:

- Table-driven unit tests for the predicate: past / today / future / undated at
  the Europe/London boundary; canonical vs mapped; inside/outside/null UK box;
  each link-gate class (organiser-owned, entry-platform + trusted governance,
  entry-platform without governance, aggregator, invalid).
- A regression fixture of ~50 real IDs with expected membership across all seven
  states, so a change in any surface is visible as a diff.
- A cross-surface consistency test asserting that no surface returns an event the
  shared predicate excludes.

### Rollback needs

- Any L4 change must be a pure function swap behind the existing call sites, so
  rollback is a revert with no data change.
- If the projection lands first, it must be additive (shadow object, old path
  untouched) so rollback never requires a grant restoration under pressure.

### Later monitoring and production acceptance evidence

- Before/after membership counts for all seven states, taken with the exact
  queries in §4.
- Sitemap URL count before and after, plus a diff of dropped/added slugs.
- Confirmation that `/events/{slug}` status codes are unchanged for a fixed
  sample (200 / 301 / 404 / 410).
- A named production commit and a post-deploy re-run of §4, not a build-passing
  claim.

---

## 9. Conflicts and decisions required

### Conflicts with current knowledge and contracts

1. **Kernel vs repository head.** The kernel names `c1cdc4a…` as the production
   baseline; the inspected head is `373cb88…`. Raised, not merged.
2. **"Discovery/counts = canonical confirmed-future G3/G4 only"** (core memory)
   vs the live headline count of 5,368, which includes 2,428 past events and
   applies no link gate. The code contradicts the stated contract.
3. **"410 needs affirmative terminal evidence"** vs the 90-day age-based 410
   rule, which uses elapsed time, not evidence.
4. **"Records are demoted/rechecked, not deleted"** is upheld — no deletion path
   exists — but `HIDDEN` (233) and `EXPIRED` (327) both 404 with no UI path back,
   which is demotion without a recheck loop.

### Decisions required from Mike

| # | Decision | Why it blocks implementation |
| --- | --- | --- |
| D-L2-1 | Which commit does production serve? | Every count and behaviour claim is head-relative until this is fixed. |
| D-L2-2 | Declare the single UK date boundary (`Europe/London` proposed) and retire both the JS-UTC and `CURRENT_DATE` authorities. | L4 cannot have one rule with two clocks. |
| D-L2-3 | Should discovery require `duplicate_of IS NULL`? (38 such ACTIVE rows exist; 22 currently discoverable, sampled in §7.) | Only behavioural change in the candidate predicate. |
| D-L2-4 | Should the headline count become a discovery count, or be relabelled? | 5,368 vs 2,528 is a factual claim on the homepage. |
| D-L2-5 | Should the sitemap adopt the discovery link gate? (360 URLs affected.) | Currently asks Google to index pages the site will not link to. |
| D-L2-6 | Approve an explicit test-record quarantine **ID list** (L5), not a name pattern. | `test-tra` and `test3-tra` are live, discoverable and in the sitemap today. |
| D-L2-7 | Approve a cancelled/terminal field (L6). | One cancelled event is currently discoverable and sitemap-eligible. |
| D-L2-8 | Should undated non-parkrun series parents (5 rows) stay discoverable? | Unclassified difference. |
| D-L2-9 | What happens to `HIDDEN` (233), `EXPIRED` (327) and `ARCHIVED` (1)? | Three statuses with no writer, no documentation and no recheck path. |

### Missing evidence

- Deployed-commit confirmation.
- Edge/CDN cache behaviour for `/sitemap.xml` and event pages.
- Whether GSC currently reports the 360 sitemap-only URLs as thin or excluded —
  would confirm or refute the risk in §3.2.2.
- Per-surface reproduced counts (§4.5) if Mike wants them for acceptance.

### Risks blocking a safe implementation prompt

- **No test coverage at all** over eligibility. Any L4 change is currently
  unverifiable except by manual counting.
- **Silent fail-open sitemap** means a deploy could halve the sitemap without any
  signal.
- **Two clocks** mean a "no-op" refactor can silently move a day boundary.
- **The region page still runs under the anon role in the browser**, so an L3
  grant hardening executed before that migration would break a live public page.

---

**Completion boundary.** This document is an investigation output. No source
code, schema, grant, view, function, job, configuration or canonical RENM
document was changed. No projection, shared predicate, quarantine or portal was
built. No publish or deploy occurred. Structural completion of this audit is not
production acceptance.
