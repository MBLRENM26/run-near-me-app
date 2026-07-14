
## What we're shipping next

Two sequential workstreams, in this order:

**B — Phase 2 taxonomy surfacing** (governance / organiser_type / race_profile are already in the DB from the earlier migration, but nothing on the public site reads them yet)

**C — Audience value pages** (`/for-runners`, `/for-clubs`, `/for-organisers`) — the "why use this site" story you called out at the start of this thread.

---

## B — Taxonomy surfacing

Goal: make the three Phase 2 columns visible and useful, without inventing prose about individual events (respects the scraped-data-trust rule).

### 1. Event detail page (`/events/$slug`)

Add a compact **Trust & profile strip** near the top, rendered only when we have real values:

- `governance` → badge, e.g. "UKA permitted", "Scottish Athletics permitted", "Unlicensed"
- `organiser_type` → badge, e.g. "Club-organised", "Commercial", "Charity", "Community"
- `race_profile` → badge, e.g. "Championship", "Local community race", "Mass participation"

Missing values render nothing — no "Unknown" placeholders. All labels come from a small enum → display map; no free-text from scraped data surfaces.

### 2. Filters on discovery surfaces

Add filter chips (governance + race_profile) to:

- Homepage `FilterBar` (behind an expandable "More filters" toggle so mobile stays clean)
- `/running-events-in.$county` and `/running-events-in-city.$city`
- Distance pages (`/10k-races`, `/half-marathons`, etc.)

Chips are only shown when the current result set actually contains events with that value (avoids dead filters).

### 3. New landing pages (SEO + navigation)

One route per high-value taxonomy value. Start with the ones with meaningful counts:

- `/uka-permitted-races`
- `/scottish-athletics-permitted-races`
- `/club-organised-races`
- `/championship-races`

Each page: H1, one short evergreen intro paragraph (hand-written template, not AI prose), the standard event grid, and cross-links to related distance/region pages. `head()` metadata per route. Only ship a route if the count clears a minimum threshold (say 20 events) — otherwise it's a thin page.

### 4. Admin

Add governance / organiser_type / race_profile selects to `/admin/events/$id` so we can curate values by hand. No bulk backfill this turn — we already learned from the organiser-club fuzzy match that low-signal backfills aren't worth the credits. Values arrive via: (a) admin edits, (b) source-specific rules in the EA/SA syncs where the source implies governance.

### 5. Discovery gate

Extend the existing `hasOrganiserOwnedLink` filter with an OR: taxonomy-tagged events with a trusted governance value are also eligible for discovery surfaces even if the link is only entry-platform. Reasoning: a UKA-permitted race on sientries is still trustworthy; the gate was designed for random aggregator scrapes.

---

## C — Audience value pages

Three new routes, each a proper standalone route with its own `head()`:

- `/for-runners` — "find the right next race, with clear provenance" — highlights: filter by distance/region/terrain, weekend pages, race reminders, parkrun hub.
- `/for-clubs` — "get your club and its races found" — highlights: free club listing, claim flow, event association, links back to the club directory.
- `/for-organisers` — "list your event, reach runners actively searching" — highlights: structured submission form, governance badges, no fee, links back to `/list-your-event`.

Each page: one hero, three-to-five value bullets, one CTA, one FAQ block reusing `site-faqs.ts` entries. Linked from the footer (and the header on desktop, under a "Why us" menu — mobile keeps the current nav to avoid clutter).

No new DB tables; these are static content routes.

---

## Order of operations

1. B1 (event page strip) — smallest, highest visibility
2. B2 (filters) + B4 (admin selects) — same PR, they touch adjacent code
3. B3 (landing pages) — check counts first, only ship viable ones
4. B5 (discovery gate extension) — small, verifiable with a SQL count before/after
5. C — audience pages once B is stable

## Out of scope for this plan

- Bulk backfill of taxonomy from scraped fields (low ROI, revisit only if a specific rule is high-confidence)
- Redesigning homepage nav / mega-menu
- Scottish Athletics organiser-URL capture (still parked; separate memory)

Approve and I'll start with B1.
