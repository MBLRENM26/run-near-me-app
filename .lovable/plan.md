## Answer first: do the `/for-runners`, `/for-clubs`, `/for-organisers` pages depend on Phase 2 columns?

**No — they don't.** Those pages are marketing/positioning surfaces: the value prop for each audience, how the site works, screenshots of real event cards, links into existing hubs (city/region/distance/terrain), and CTAs (list-your-event, claim-your-club). They read from what we already have. We can build them any time — parking them until you say the word is fine.

The only *nice-to-have* overlap: once governance/organiser_type exist, the `/for-clubs` page could show "X England Athletics licensed events this month" as a live number. That's a one-line stat, not a dependency.

---

## Part A — Audit top event pages (read-only, no code)

Goal: prove the Phase 1 blocks (Organised by, Trust strip, Useful links, Same weekend nearby, Other races by organiser) actually render with content on the pages people land on, and quantify dead-end pages.

### A1. Pick the sample
The top ~20 event pages by Plausible traffic over the last 30 days (I'll pull from analytics). Fall back to featured + soonest-upcoming if Plausible list is thin.

### A2. For each page, record
- `has_organiser_line` — club match resolved? (needs a `clubs` row whose name/slug matches `events.organiser`)
- `has_trust_strip` — `source` populated? (always yes post-import, but confirm)
- `useful_links_count` — distinct official URLs beyond the primary CTA
- `same_weekend_nearby_count` — rows returned by the county+date window query
- `other_races_by_organiser_count` — rows for the same organiser/club

### A3. Deliverable
A single markdown table written to `docs/audits/top-event-pages-YYYY-MM-DD.md` with per-page counts + an "empty blocks" summary (e.g. "6/20 pages have 0 same-weekend-nearby"). No page changes yet — findings drive the next PR.

### A4. Likely follow-ups (surfaced by audit, not implemented in this PR)
- If "same weekend nearby" is empty on many pages: widen from county → region as fallback (behind a flag).
- If "organised by" rarely resolves: the `events.organiser` string doesn't match `clubs.name` cleanly — needs a fuzzy match / slugified lookup.

---

## Part B — Phase 2: classification columns

Add three nullable columns to `events`. All three are derivable from what we already ingest (source, organiser string, distances, terrain_tags, licensed) — no manual data entry required for the initial backfill.

### B1. Schema (one migration)

```sql
CREATE TYPE public.event_governance AS ENUM (
  'england_athletics','scottish_athletics','welsh_athletics',
  'athletics_ni','tra','arc','fra','wfra','sha','parkrun',
  'unlicensed','unknown'
);

CREATE TYPE public.event_organiser_type AS ENUM (
  'club','commercial','charity','parkrun','community','governing_body','unknown'
);

CREATE TYPE public.event_race_profile AS ENUM (
  'road_race','trail_race','fell_race','ultra','multi_terrain',
  'track','cross_country','parkrun','virtual','other'
);

ALTER TABLE public.events
  ADD COLUMN governance      public.event_governance,
  ADD COLUMN organiser_type  public.event_organiser_type,
  ADD COLUMN race_profile    public.event_race_profile;

CREATE INDEX events_governance_idx     ON public.events (governance)     WHERE status = 'ACTIVE';
CREATE INDEX events_organiser_type_idx ON public.events (organiser_type) WHERE status = 'ACTIVE';
CREATE INDEX events_race_profile_idx   ON public.events (race_profile)   WHERE status = 'ACTIVE';
```

All nullable, no defaults, no grants change (existing table grants cover new columns).

### B2. Derivation rules (one server-side backfill script, idempotent)

Priority order per column, first hit wins; leave NULL if no rule matches.

**governance** — from `source` + `licensed`:
- `source = 'england-athletics'` → `england_athletics`
- `source = 'scottish-athletics'` → `scottish_athletics`
- `source = 'welsh-athletics'` → `welsh_athletics`
- `source = 'athletics-ni'` → `athletics_ni`
- `source = 'tra'` → `tra`
- name contains "parkrun" → `parkrun`
- `licensed = 'false'` → `unlicensed`
- else → `unknown`

**organiser_type** — from name/organiser/source:
- `source = 'parkrun'` OR name ~ 'parkrun' → `parkrun`
- `organiser` matches a `clubs.name` (slugified) → `club`
- organiser contains "runthrough|nice work|race nation|xempo|goodrun|entrycentral" → `commercial`
- organiser contains "cancer research|macmillan|british heart|race for life" → `charity`
- `governance IN (england_athletics, scottish_athletics, welsh_athletics, athletics_ni)` AND no organiser → `governing_body`
- else → `unknown`

**race_profile** — from `terrain_tags` + `distance_tags` + name:
- `'parkrun' = ANY(distance_tags)` OR name ~ 'parkrun' → `parkrun`
- `'ultra' = ANY(distance_tags)` → `ultra`
- `'fell' = ANY(terrain_tags)` → `fell_race`
- `'trail' = ANY(terrain_tags)` → `trail_race`
- `'multi-terrain' = ANY(terrain_tags)` → `multi_terrain`
- `'road' = ANY(terrain_tags)` → `road_race`
- name ~ 'virtual' → `virtual`
- else → `other`

Backfill runs as a server function (admin-only, `has_role` gated). Not surfaced in the UI this PR.

### B3. Verification
- Query counts per enum value after backfill, written to console + summary comment on the PR.
- Sanity check: England Athletics feed rows should be ~100% `governance = england_athletics`, ~majority `organiser_type = club`.

### B4. What this PR does NOT touch
- No new pages or filters use these columns yet.
- No sitemap changes.
- No changes to `DISCOVERY_EVENT_COLUMNS` (adding them there would leak into SSR hydration before they're ready — same rule as `source`).
- No `/for-*` pages.

---

## Technical notes

- Migration + backfill are separate steps: migration is a schema change (migration tool), backfill is `UPDATE` (insert tool / server function).
- Enums chosen over free-text columns so future filter UIs get compile-time safety and the DB rejects typos.
- Partial indexes (`WHERE status='ACTIVE'`) keep them tiny — we only ever filter classification on live events.
- Backfill script lives at `src/lib/admin-classify-events.functions.ts`, invoked from an admin page (reuses `_adminShell` pattern). One-shot, but re-runnable safely.

---

## Order of work
1. Part A audit (read-only, one doc file).
2. Review audit findings with you before deciding on any Part A follow-ups.
3. Part B schema + backfill.
4. Report enum distribution counts.
5. Stop — `/for-*` pages and any UI that uses the new columns come in a later PR.