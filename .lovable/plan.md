# Next phase plan: tracking, visibility, supply-side data

Three workstreams in order. Each is independently shippable.

Confirmed scope: Wales has 258 active events; 88 missing town, 99 missing distances (~38%) — the visible data quality issue. The fix is supply-side (organisers + AI enrichment), not better scraping. An admin shell already exists at `/admin` (login + claims page) so we extend it rather than build new.

Global rollout deferred (your call) — we will NOT restructure URLs to `/uk/...` now. We will add a `country` column on events (default `GB`) so the schema is ready, but routes stay as-is.

---

## Phase 1 — Analytics & link tracking (smallest, ship first)

**Goal**: know which events, regions, and CTAs actually drive engagement before we build more.

Add these custom Plausible events from the existing `plausible()` global (already loaded in `__root.tsx`):

| Event name | Props | Fires when |
|---|---|---|
| `Entry Click` | `slug, region, link_type` (entry/organiser), `proximity` (future/imminent/past) | User clicks the primary CTA on an event page |
| `Outbound Click` | `slug, host, link_type` | Any outbound link (auto-tracked via Plausible's `outbound-links` extension) |
| `Search` | `query, results_count` | Homepage search submitted |
| `Filter` | `filter_type, value, page` | Distance/month/region filter changed |
| `Claim Interest` | `slug, region` | "Are you the organiser?" CTA clicked (phase 3 surface) |
| `Region View` | `region, distance` | Region/distance landing pages loaded |

Implementation:
- Add a tiny `src/lib/analytics.ts` wrapper: `track(name, props)` that no-ops if `window.plausible` is missing.
- Add `data-domain` + the `script.outbound-links.js` Plausible extension in `__root.tsx` head.
- Wire `track()` calls into the existing CTA buttons, filter components, search, region/distance pages.

Plausible UI will auto-show the goals once events fire — no API integration, no secret.

---

## Phase 2 — Admin data browser (operational unblock)

**Goal**: you can see and fix data without me. Lives under existing `/admin` shell.

New admin pages:

1. **`/admin/events`** — searchable, filterable table (region, distance, status, has-town, has-distance, has-coords, is-featured, date range). Columns: name, date, town, region, distances, source, links. Row click → edit drawer. Bulk select → bulk actions (set region, set status, delete).
2. **`/admin/events/$id/edit`** — full field editor (all 32 columns visible, grouped: identity / location / dates / classification / links / flags). Audit field: `updated_by` (admin id), `updated_at`.
3. **`/admin/data-quality`** — dashboard of gap counts per region/country: missing town, missing distances, missing coords, missing entry/organiser URL, date estimated, no source URL. Each row links to a pre-filtered `/admin/events` view.
4. **CSV export** — "Export current view" button on `/admin/events` runs the same query server-side and streams a CSV.

All pages use existing `_adminShell` auth gate. Server fns use `supabaseAdmin` (admin already authorised).

Schema additions (one migration):
- `events.country` text default `'GB'` not null (lays groundwork; no route changes yet).
- `events.updated_by` text null, `events.updated_at` timestamptz default now().
- `events.claimed_by_user_id` uuid null (used in phase 3).
- `events.enrichment_status` text null (`unverified` / `ai_enriched` / `organiser_verified`).
- Index on `(status, region, country)` for the admin filters.

---

## Phase 3 — Organiser claim flow (the real moat)

**Goal**: turn the 38% gap into a supply-side acquisition funnel. Every empty field on a public event page becomes a "Claim this event" CTA.

Flow:
1. **Public event page** — when `claimed_by_user_id IS NULL`, show subtle "Are you the organiser? Claim this listing" banner. Empty rich-data sections (terrain, elevation, start time, etc.) show inline "Organiser: add this" prompts.
2. **Claim wizard** (`/events/$slug/claim`): email capture → magic link verification (Supabase Auth, email OTP) → claim form (proves ownership by either: (a) email matches a domain on the existing entry/organiser URL, auto-approved; (b) manual review queue, you approve in `/admin/claims` — already exists).
3. **Organiser dashboard** (`/_authenticated/my-events`): list claimed events, edit rich fields (terrain, elevation_gain_m, start_time, course_type, surface_breakdown, has_chip_timing, has_medal, charity, photos_url, gpx_url, full_description).
4. **Public event page renders rich fields** only when present and `enrichment_status = 'organiser_verified'`. Other fields stay hidden — preserves the trust rule (no AI-slop, no unverified facts on the page).

Schema additions (second migration):
- `events`: `terrain text[]`, `elevation_gain_m int`, `start_time time`, `course_type text`, `surface_breakdown jsonb`, `has_chip_timing bool`, `has_medal bool`, `charity text`, `photos_url text`, `gpx_url text`, `full_description text`, `verified_at timestamptz`.
- New table `event_claims` (id, event_id, user_id, email, status: pending/approved/rejected, evidence text, decided_at, decided_by). Already partly modeled in existing `submissions` table — review whether to extend that vs new table during build.

Auth: this is the first end-user-facing auth in the app. Use the integration's `_authenticated/` layout (already documented in stack guidance). Add Google sign-in via the Lovable broker + `configure_social_auth` in the same migration turn.

---

## Deferred (explicit, so we don't forget)

- **Global rollout / country-aware URLs** — `country` column lands in phase 2 so when you're ready it's just a route refactor + 301s. Don't do it now.
- **AI enrichment from source URLs** — only after claim flow proves which fields organisers won't fill themselves. Marked `enrichment_status='ai_enriched'` and shown with a clear "auto-detected, unverified" label.
- **GPX/elevation pipeline** — wait for ≥50 claimed events with GPX uploads to justify the work.
- **In-app Plausible dashboard** — your call: Plausible UI is enough for now.

---

## What I need from you to start phase 1

Nothing. Phase 1 needs no secrets, no schema changes, no user input. Once you approve this plan I'll implement phase 1 end-to-end, then stop for your review before phase 2.

Phase 2 will need one DB migration approval. Phase 3 will need migration approval + Google OAuth provider config (I'll guide you when we get there).
