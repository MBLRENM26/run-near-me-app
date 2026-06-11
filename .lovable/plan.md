## What's actually wrong

Database check on "North Downs" returned two ACTIVE rows for the same race:

| slug | date_raw | sort_date | distances | discipline | tags |
|---|---|---|---|---|---|
| `north-downs-run-2026` | "28 June 2026" | 2026-06-28 | `30K` | `Multi-Terrain Race` | `{}` / `{}` |
| `north-downs-run-north-downs` | "Late June / Early July 2026" | NULL | `Various (trail)` | (empty) | `{}` / `{}` |

Plus, the tagging stats: **584 tagged out of 5233 active rows**, and `is_curated_tags = false` on both North Downs rows — meaning the backfill never reached them.

So two distinct issues are stacked, both worth fixing properly:

### Issue 1 — Backfill is not actually complete

`backfillEventTags` caps each call at 2000 rows and returns `remaining_hint` for the admin to click again. The button was clicked once; 4649 rows were never scanned, including `north-downs-run-2026`. Until that row is parsed, the trail page only sees it via the legacy `distances` substring matcher — which on `30K` returns false.

### Issue 2 — Duplicate ACTIVE listings

`north-downs-run-north-downs` is a low-quality scrape of the same event as `north-downs-run-2026`. Both are ACTIVE, so:

- **South East → trail (no month filter)**: only the bad dupe surfaces. The legacy `distances` substring sees `"Various (trail)"` → matches `trail`. The good row's `30K` does not contain "trail", so it's skipped (no tags yet → see Issue 1).
- **South East → trail → June**: the bad dupe has `sort_date = NULL`, so it's dropped from June. The good row would be in June but fails the trail filter. Result: nothing.

This is the exact pattern the user saw.

The dedupe pipeline (`status = DUPLICATE`, `duplicate_of`, the survivor redirect in `getEventPageData`) already exists — the North Downs Way Ultra row uses it correctly. The gap is that there is no admin surface for finding and merging duplicates of ACTIVE rows. Until there is, duplicates like this will keep slipping through whenever the scraper produces a near-miss slug.

---

## Plan

### Slice A — Finish the backfill (small, immediate)

Run the existing parser across the remaining ~4650 rows so tag-based filtering becomes the source of truth, not the legacy substring fallback.

1. **Auto-loop the admin action.** Change the "Backfill missing tags" button handler to call `backfillEventTags` in a loop until `remaining_hint` is null, showing running totals (`scanned`, `updated`, `unchanged`) in a toast / status line. Same server function, no schema change.
2. **Keep the per-call cap at 2000** so each request stays well under the Worker limit; the loop handles completeness.
3. **Verification:** after the run, `SELECT count(*) FILTER (WHERE cardinality(distance_tags)+cardinality(terrain_tags) > 0)` should equal the count of non-curated ACTIVE rows. `north-downs-run-2026` should end up with `distance_tags = {30k}`, `terrain_tags = {multi-terrain, trail}`.

This alone fixes "South East → trail → June" — the good North Downs row will now match.

### Slice B — Duplicate detection & merge (the structural fix)

Without this, scraped duplicates will keep slipping in and will quietly break filter pages.

1. **Detection query.** Add `findPotentialDuplicates` (server fn, admin-only) that groups ACTIVE rows by a normalised key: `(slugify(name) without trailing year tokens, region, rough month bucket)`. Returns clusters of size ≥ 2 with both rows' key fields side by side. No schema change.
2. **Admin "Duplicates" tab** at `/admin/events/duplicates` listing the clusters. Each row in a cluster shows: slug, date_raw, sort_date, distances, discipline, source_url, tag completeness, last_seen. The admin picks the survivor; the other becomes `status = DUPLICATE` with `duplicate_of = survivor.id`. This is exactly what the existing event page redirect already handles, so no consumer code needs to change.
3. **Merge action** writes both updates in one server fn (`mergeDuplicateEvents({ survivorId, duplicateId })`) and logs to `event_edits` so the action is auditable. Survivor keeps its tags; if survivor's tags are empty and the duplicate's are not, copy them across (rare, but cheap).
4. **One-shot fix for North Downs**: from the new UI, mark `north-downs-run-north-downs` as DUPLICATE of `north-downs-run-2026`. Verification: visiting `/events/north-downs-run-north-downs` 301s to `/events/north-downs-run-2026`, and South East → trail → June now lists the 30K once.

### Out of scope (deliberately)

- Auto-merging on scrape. Detection only; humans confirm. Wrong merges are expensive to unwind.
- Rewriting the scraper to avoid producing dupes in the first place — that's a separate, larger piece of work.
- Touching `getEventPageData` redirect logic — already correct.

### Sequencing

Slice A first (fast, unblocks the immediate symptom for every untagged row, not just this one), then Slice B (structural, prevents recurrence). Both before resuming Slice 3 (CSV import), since CSV import will only make duplicate pressure worse without the merge tool in place.