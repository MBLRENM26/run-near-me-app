## Two pieces of work

### 1. Back-to-search affordance (sitewide)

**Problem:** Event and club page breadcrumbs are `Home → Region → Event` and `Home → Running clubs → Club`. Neither knows you arrived from `/search?q=…`, so once you've done `search → race → club` the browser back stack loses your result set.

**Fix:**
- In `src/routes/search.tsx`, append `?from=search&fromQ={q}` to every event and club result link.
- New `src/components/site/BackToSearchBar.tsx` — reads `from` / `fromQ` via `useSearch({ strict: false })`. When `from === "search"` and `fromQ` is non-empty, renders a chip above the breadcrumb:
  > ← Back to search results for "*{q}*"
  linking to `/search?q={fromQ}`.
- Mount on every public content page reachable from search: `events.$slug`, `running-events.$slug`, `running-events.$slug_.$distance`, `running-clubs.$slug`, `running-clubs.$slug.claim`, `running-clubs.index`, distance pages, region pages, parkrun pages.
- Onward links from these pages (linked club on an event page, events list on a club page, etc.) forward `from=search&fromQ` when present so the chip survives a second hop.
- Each affected route adds `from: z.enum(["search"]).optional()` + `fromQ: z.string().max(80).optional()` to `validateSearch` via `fallback()`.
- Analytics: fire `track("Back to search clicked", { q })` when the chip is used.

No DB changes. No schema/contract changes.

### 2. Admin date-enrichment importer

**Need.** Two distinct backlogs:
- 535 events with `date_is_estimated = true` — your CSV addresses 208 of these and overwrites 1 confirmed date.
- 1,395 events with `sort_date IS NULL` — separate workstream; same importer will handle them when you have data.

**Build:**
- New admin route `/admin/events/enrich-dates` (gated by existing `requireAdminOrThrow`).
- CSV paste OR upload. Required columns: `id`, `sort_date`. Optional: `date_raw`, `date_is_estimated` (default `false`), `date_from`, `date_to`. Extra columns ignored — matches your file shape exactly.
- **Dry-run preview is mandatory** before any write. Preview shows:
  - Matched / unmatched ids
  - Per-row diff: current `sort_date` / `date_raw` / `date_is_estimated` → proposed
  - Three buckets, colour-coded: *no-op* (identical), *safe change* (filling null or replacing estimated), *overwrite confirmed* (current `sort_date` is non-null and `date_is_estimated = false`)
- Overwrites of confirmed dates are **skipped by default**. Operator must tick a per-row "force" checkbox (or a global "force all overwrites" toggle) to include them. For your file this surfaces the single row that would clobber a confirmed date so you can decide.
- Commit writes via a new `applyDateEnrichments` server fn using `supabaseAdmin`. Updates `sort_date`, `date_raw`, `date_is_estimated`, plus `updated_at = now()`.
- Audit: one `sync_runs` row per import (`source: 'manual-date-enrich'`, totals + summary JSON). Visible in the existing admin sync-runs page.
- Hard limit 5,000 rows per import (your file is 208; backlog batches stay well under).

**Out of scope (for this turn):**
- Slug/name fuzzy matching — id-keyed only, which is what your file uses.
- Editing other event fields (location, distance, etc.) — dates only.

### Order

1. Ship the back-to-search chip (small).
2. Ship the date-enrichment importer.
3. You run the CSV through dry-run → commit. We can then talk about sourcing dates for the 1,395 dateless rows.

### Technical notes

- BackToSearchBar uses `useSearch({ strict: false })` so it works under any route without per-route typing.
- Search-param forwarding from event/club pages uses a tiny helper `withFromSearch(search)` so we don't sprinkle conditionals across links.
- Importer parses CSV client-side (PapaParse, already a transitive dep — confirm before adding) to keep the preview snappy, then ships the parsed rows to the server fn for validation + write. Server re-validates with Zod; never trust client parsing.
- No migrations.
