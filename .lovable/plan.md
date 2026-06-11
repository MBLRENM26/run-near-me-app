## Goal

Give you direct, password-gated control over the `events` table from the admin UI, so individual fixes (like the Big Half / Vitality 10K episode) and bulk imports (the 128 enriched Welsh + NI rows) don't require a chat round-trip.

Shipped in three sequenced slices. Each slice is independently useful and deployable — you can start using slice 1 the day it lands without waiting for 2 and 3.

---

## Slice 1 — Browse + edit any event (the unblock)

New route: `/admin/events` (under existing `_adminShell` so it inherits the password gate).

**List view**
- Server-paginated table (50/page). Columns: name, date, town, region, distances, status, source, featured, updated.
- Filters: text search (name/slug/town), region (dropdown from `REGIONS`), distance bucket, status, source, "missing lat/lng", "date estimated", upcoming-only.
- Sort by `sort_date` (default), `name`, `created_at`.
- Each row has an "Edit" button → opens the editor (drawer or sub-route — drawer keeps filter state).

**Edit view — every field except system-owned**
Editable: `name`, `slug`, `date_raw`, `sort_date`, `date_from`, `date_to`, `date_is_estimated`, `is_recurring`, `is_upcoming`, `town`, `county`, `region` (dropdown), `country`, `location_raw`, `lat`, `lng`, `distances`, `discipline`, `entry_fee`, `organiser`, `entry_url`, `organiser_url`, `source`, `source_url`, `licensed`, `is_featured`, `status` (dropdown: ACTIVE/HIDDEN/DRAFT), `duplicate_of`.
Read-only: `id`, `created_at`, `norm_id`, `norm_created_at`.

**Validation (server-side, before write)**
- Slug: kebab-case `^[a-z0-9-]+$`, unique, max 200 chars; auto-suggest from `name` if blank.
- Region: must be one of the 12 canonical names in `src/lib/regions.ts` (or null for overseas). Free-text rejected — prevents the slug-mismatch trap you flagged.
- lat/lng: both null or both set; lat ∈ [-90,90], lng ∈ [-180,180].
- URLs: each routed through `classifyEventLink` and the resulting trust tier shown beside the input (so you can see whether `entry_url` will render as "Enter now" or be suppressed as an aggregator).
- status: enum-checked.

**Delete + soft actions**
- "Set status = HIDDEN" (soft hide, keeps URL). Hard delete behind a second confirm, available only for `source = 'manual'` rows to start.
- "Mark as duplicate of…" sets `duplicate_of` via slug picker.

**Audit trail**
- Tiny `event_edits` table: `id, event_id, edited_at, changes jsonb, note text`. Every save writes a diff row. Lets you eyeball what changed without git-for-data.

**Files**
- `supabase/migrations/...` — new `event_edits` table, GRANT block, RLS (admin-only via service role, no anon/auth grants needed since access is service-role).
- `src/lib/admin-events.functions.ts` — `listAdminEvents`, `getAdminEvent`, `updateAdminEvent`, `deleteAdminEvent`, all gated by existing `requireAdminOrThrow()`, all using `supabaseAdmin`.
- `src/routes/_adminShell.admin.events.tsx` — list + filters.
- `src/routes/_adminShell.admin.events.$id.tsx` — editor.
- `src/components/admin/EventEditor.tsx`, `EventListRow.tsx`, `EventFilters.tsx`.
- Sidebar link added to `_adminShell.tsx`.

---

## Slice 2 — Add new event

Reuses the slice 1 editor with empty defaults.

- Route: `/admin/events/new`.
- Same validation as edit. `source` defaults to `manual`. `norm_id` auto-set to `manual:{slug}`.
- After save, redirects to the editor for that new row so you can keep tweaking.
- "Duplicate this event" button on the editor → prefills a new draft with date cleared (useful for annual recurrences).

No new server fn beyond `createAdminEvent` (validation shared with `updateAdminEvent`).

---

## Slice 3 — Bulk CSV import (the Wales + NI patch path)

Two-step flow so you never overwrite blind.

**Step A: Upload + dry-run**
- `/admin/events/import` — file input accepts CSV.
- Server parses (header row required), validates every row through the same schema as slice 1.
- Match key: `norm_id` if present, else `slug`, else `(name + sort_date)` fallback.
- For each row produces one of: `CREATE`, `UPDATE` (with field-level diff), `SKIP` (no changes), `ERROR` (with reason).
- Result shown as a table: counts at top, expandable per-row diff. **Nothing written yet.**

**Step B: Apply**
- "Apply 128 changes" button. Server re-validates and writes in a transaction-per-row (so one bad row doesn't kill the batch). Writes `event_edits` rows with `note: 'csv-import:{filename}'`.
- Final screen: succeeded / failed counts, downloadable error CSV.

**CSV column contract**
- Required: `name`, one of (`slug` | `norm_id`).
- Optional: every editable field from slice 1, plus `region_slug` (auto-resolved to region name via `REGIONS`) so you can paste from the NORMALISED sheet without manual region-name typing.
- Boolean columns accept `true/false/1/0/yes/no`.
- Unknown columns are ignored with a warning row at the top of the dry-run (helps catch typos like `distance` vs `distances`).

**Files**
- `src/lib/admin-import.functions.ts` — `dryRunImport`, `applyImport`.
- `src/routes/_adminShell.admin.events.import.tsx`.
- `src/components/admin/ImportDryRunTable.tsx`.

---

## On the region-slug consistency check you raised

Folded into slice 1, not deferred:
- The editor's region field is a dropdown sourced from `src/lib/regions.ts` — there is no way to save a free-text region from the UI.
- A one-off read-only diagnostic (`/admin/events?region_invalid=1`) lists any row whose `region` doesn't match a canonical name, so you can spot legacy strays before building town pages.
- No slug refactor in this phase — just enforcement going forward + visibility of existing drift.

## Out of scope (next phase, not this one)

- Town pages, distance hub pages, distance landing pages, sitemap/schema updates for those.
- Slug renaming with redirect history.
- Multi-user admin / per-user audit (single admin password stays).
- Image/photo fields (none exist on `events` yet).

## Suggested order of operations on your side

1. Approve slice 1 plan → I build → you start fixing rows the same day.
2. Approve slice 2 → I build (small, ~half a slice).
3. Approve slice 3 → I build → you export the NORMALISED sheet as CSV → dry-run → apply.
