## Add checkbox multi-select + "Mark selected as series"

Simple UX upgrade to the `/admin/events/duplicates` page. No backend changes — the `markClusterAsSeries` server fn already accepts an array of ids, so we just feed it a different set.

### Changes (single file: `src/routes/_adminShell.admin.events.duplicates.tsx`)

1. **Per-cluster checkbox** in each `ClusterCard` header (next to "Mark as series"). Toggling it selects every row in that cluster. Useful for the common case: "this whole cluster is a series".

2. **Section-level "Select all" checkbox** at the top of each tier section (High / Medium / Low) — one click selects every cluster in that tier. Main win for the Low tier where most EA-sourced clusters are series.

3. **Sticky action bar** at the bottom of the page when ≥1 cluster is selected:
   - "N clusters selected (M rows)"
   - "Mark selected as series" button → loops over selected clusters and calls `markClusterAsSeries({ ids })` for each (sequentially, with a single toast summarising results).
   - "Clear selection" button.

4. **Optional per-row checkbox** — skipped. Series detection is cluster-level; mixing rows across clusters would create one bogus `series_key`. Cluster-level selection is the right granularity.

### Out of scope
- No schema changes.
- No new server fn (existing `markClusterAsSeries` is reused per cluster).
- No change to high/medium merge flow.

### Why this is cheap
The state is just a `Set<clusterKey>` in the existing component. Sticky bar is a fixed div. ~40 lines of code, one file.
