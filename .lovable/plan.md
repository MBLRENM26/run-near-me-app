## Short answer

No — you should not have to click through them one by one. But blanket auto-merging is the wrong fix: the normaliser is intentionally loose, and one wrong merge sends real traffic and SEO equity to the wrong page. The right answer is **tiered confidence + bulk actions**, so the boring obvious cases collapse in a couple of clicks and only genuinely ambiguous clusters need eyes.

## What we have now

`findPotentialDuplicates` clusters ACTIVE rows by `(normalised name, region)`. Survivor is auto-chosen (has `sort_date`, then most tags). Merge is one button per duplicate row. That's it — no confidence score, no bulk action, no signal for "are these actually the same race or just same-named events in different months?".

## Plan

### Slice 1 — Confidence score per cluster (no schema change)

Compute a tier server-side from data already on the rows:

- **High** — same `sort_date` (exact), or same month + same town, or shared `source_url` host + same month. Almost certainly the same race.
- **Medium** — same month, town matches OR is null on one side, distances overlap.
- **Low** — name+region match but dates conflict (different months with both populated), or towns conflict. Likely a recurring series or a name collision (e.g. "Park 5K" in two different towns within one region).

Return `confidence: "high" | "medium" | "low"` and a one-line `reason` per cluster. Group the UI by tier.

### Slice 2 — Bulk merge for High-confidence clusters

In the duplicates UI:

- "Merge all in this cluster into survivor" button per cluster (one call, N-1 merges).
- "Merge all High-confidence clusters" button at the top, with a confirm dialog showing the count and a 10-row sample.
- Both run through the existing `mergeDuplicateEvents` per pair so `event_edits` logging, tag-copying, and the redirect contract are unchanged.

Server-side, add `mergeDuplicateCluster({ survivorId, duplicateIds[] })` that wraps the existing logic in a loop with per-row error capture, and returns `{ merged, failed: [{id, error}] }`. No new DB primitives.

### Slice 3 — Low-confidence stays manual; Medium is one-click-per-cluster

- Low tier renders with a warning banner and no bulk button — admin reviews row-by-row as today.
- Medium tier shows the per-cluster bulk button but not the global "merge all" button.

### Slice 4 — Undo safety net (optional, recommended)

A merge sets `status=DUPLICATE` and `duplicate_of`. Add an "Unmerge" action on the event edit page that flips `status` back to ACTIVE and clears `duplicate_of`, logged to `event_edits`. Cheap insurance against a bad bulk run; no schema change.

### Out of scope

- Changing the clustering key (e.g. fuzzy name matching, cross-region). Current key is conservative on purpose; we tighten the *action*, not the *detection*, in this pass.
- Auto-merging on scrape. Still humans-in-the-loop, just with bigger levers.
- Backfilling redirects for slugs that were never published — the existing `getEventPageData` redirect already handles all live URLs.

### Sequencing

Slices 1+2 together (they're the actual answer to your question). Slice 3 is one-line UI gating off Slice 1. Slice 4 separately if you want it before running a big batch.

## Recommendation

Do 1+2+4 in one pass, then run "Merge all High-confidence" once and report back what's left. Realistically that collapses the bulk of the duplicate list in a single action, and you only hand-review Medium/Low.