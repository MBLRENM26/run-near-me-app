# Add clubs to search + admin club management

Right now `/search` only hits events, and the admin only has a Club **claims** queue — there's no way to list, create, or edit clubs themselves. This plan adds both.

## 1. Clubs in site search

Extend the search results page so a query like "aspire" returns matching clubs alongside events.

- New SQL function `search_clubs_v1(q text, lim int)` — ts_rank over a tsvector on `clubs.name`, `town`, `county` (weighted), restricted to `status = 'ACTIVE'`. Mirrors `search_events_v1`. Returns only public-safe columns (`id, slug, name, town, county, region, governing_body, is_claimed`).
- Add `tsv` generated column + GIN index on `clubs` (same shape as events) via migration.
- New server fn `searchClubs` in `src/lib/search.functions.ts` returning `ClubSearchResult[]`.
- `/search` loader runs `searchEvents` and `searchClubs` in parallel; page renders two sections: **Events** then **Clubs** (each section hidden when empty, "No results" copy updated to mention both).
- Club rows link to `/running-clubs/$slug` with town/county and a small "Claimed" badge when `is_claimed`.
- Analytics: extend `track("Search Performed", …)` payload with `clubs_count`; click tracking already keyed by slug works as-is.

Postcode flow and existing event behaviour are unchanged.

## 2. Admin: clubs list, create, edit

New section in the admin shell, sitting next to existing **Club claims**.

- Header nav: add **Clubs** link in `src/routes/_adminShell.tsx`.
- New route `/_adminShell/admin/clubs` — paginated list with:
  - Search box (name / town / slug)
  - Filters: governing body, region, status, claimed/unclaimed
  - Columns: name, slug, town, county, region, governing body, claimed, status
  - "New club" button → `/admin/clubs/new`
- New route `/_adminShell/admin/clubs/$id` — full edit form covering every editable field on `clubs` (name, slug, governing_body, affiliation_number, town/county/region/country/postcode, lat/lng, website_url, contact_email, contact_phone, disciplines, status, is_claimed/claimed_by/claimed_at). Includes "Delete club" (soft-delete via `status = 'INACTIVE'`).
- New route `/_adminShell/admin/clubs/new` — same form, blank, generates slug from name if left empty (reusing the slugify logic from the import route), uniqueness-checked server-side.
- New server fns in `src/lib/admin-clubs.functions.ts` (extending the existing file), all gated by `requireAdminOrThrow()`:
  - `listAdminClubs({ q, governing_body, region, status, claimed, limit, offset })`
  - `getAdminClub({ id })`
  - `createAdminClub(payload)` — sets `norm_id = 'manual:<uuid>'` so it never collides with importer rows, runs slug-uniqueness check.
  - `updateAdminClub({ id, patch })`
  - `setClubStatus({ id, status })` for soft delete / reactivate.
- Validation: Zod schemas mirroring the importer's `ClubRowSchema`, plus the same `classifyEventLink` aggregator-host guard on `website_url`.

## Technical notes

- All new admin fns use `supabaseAdmin` inside the handler (existing pattern in `admin-clubs.functions.ts`).
- Search RPC is `SECURITY INVOKER` + `SET search_path = public`, same pattern as `search_events_v1`.
- Migration order per house rules: `CREATE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`. The new search RPC needs `GRANT EXECUTE … TO anon, authenticated` so the publishable server path can call it; admin fns continue to use service role.
- No changes to `clubs` RLS policies, the public `public_clubs` view, or the importer endpoint.
- No design changes beyond reusing existing admin form/table primitives (`Input`, `Select`, `Button`, `Textarea`).

## Out of scope

- Bulk edit / CSV import via UI (importer endpoint already exists).
- Merging duplicate clubs (mirror of the events-duplicates tool) — happy to add as a follow-up if you want it.
- Map-pin / geocoding helper inside the admin form (lat/lng stays manual for now).

Shall I build it?
