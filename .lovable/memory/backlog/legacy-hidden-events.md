---
name: Legacy HIDDEN event rows
description: 233 events sit in status=HIDDEN, a status no current code path assigns; root-cause and migrate to ACTIVE/DUPLICATE/EXPIRED so the enum reflects reality
type: feature
---

Today's GSC fix (2026-07-16) treats every HIDDEN row as a real 404 via
`throw notFound()` in `getEventPageData` (src/lib/events.functions.ts).
That kills the soft-404 signal but leaves the underlying data question open:

- 233 rows sit in `status='HIDDEN'`.
- 145 have `sort_date >= today` (upcoming).
- 88 are past.
- No current sync path, admin UI, or server function assigns HIDDEN.
- Admin UI (src/lib/admin-events.functions.ts STATUS_VALUES) only exposes
  ACTIVE / DUPLICATE / EXPIRED.

Because HIDDEN is ambiguous (mid-edit? postponed? manually removed?),
we picked 404 (reversible) rather than 410 (permanent). If someone
re-classifies these rows, Google re-indexes on its own.

Root-cause work when we revisit:
1. Query origin: `select source, count(*) from events where status='HIDDEN' group by 1` — does the cohort come from one importer / one date range?
2. Decide per-row whether HIDDEN → ACTIVE (bring back into discovery),
   DUPLICATE (merge into a survivor with `duplicate_of` set), or EXPIRED
   (past events not worth re-surfacing).
3. Consider whether we still need a HIDDEN status at all, or whether
   removing it from the enum is safe once these rows are migrated.
