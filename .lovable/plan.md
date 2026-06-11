## The problem

Some "Low confidence" duplicates aren't duplicates — they're legitimate **recurring series** (RunThrough Tatton Park 5k every fortnight, Grand Prix series, etc.). Merging them all into one survivor would hide future fixture dates and lose accurate per-event entry URLs. Leaving them as N separate events bloats listings, confuses users ("which Tatton Park 5k do I click?"), and dilutes SEO across near-identical pages.

We already have an `is_recurring boolean` column on `events` (currently set by the importer for some sources, but otherwise unused). Let's make it do real work.

## Plan

### Slice 1 — Detect "series" clusters in the duplicates view

In `findPotentialDuplicates`, when a Low-confidence cluster has **3+ rows, same name, same region, same town, distances overlap, dates spread across multiple weeks/months**, tag it as `kind: "series"` (vs the existing `kind: "duplicate"`). Add an optional `recurring_source` flag set true when every row's `source` is the same (e.g. all `england-athletics` + `runthrough` in name) — strong signal it's a legit series feed, not scrape noise.

UI: render series clusters in a separate section above Low duplicates, with copy: "Looks like a recurring series — don't merge."

### Slice 2 — One-click "Mark cluster as series"

Adds a `markClusterAsSeries({ ids[] })` server function that:
- Sets `is_recurring = true` on every row.
- Optionally writes a shared `series_key` (slugified name+town) so we can group them later. Cheap to add as a nullable text column; no behaviour change until something reads it.
- Logs each change in `event_edits`.

After marking, those rows stop appearing in the duplicates scan (filter out `is_recurring = true` from the clustering input).

### Slice 3 — Surface "is_recurring" on listing pages

Today recurring events show as N separate cards on month/distance/region pages, indistinguishable from one-offs. Two cheap improvements:

- **Card badge:** show a "Recurring" pill on `EventCard` when `is_recurring`. Honest signal, no de-dup required.
- **Listing collapse (optional, behind a feature flag):** on region/distance index pages, when multiple `is_recurring` rows share `(name, town)`, collapse them to a single card showing "Next: <date> · +N more dates". Click expands or links to the canonical event page which lists all upcoming dates. Skip this if it's more work than you want right now — the badge alone is a decent fix.

### Slice 4 — Event page shows the schedule

On `/events/<slug>` for a recurring row, query sibling rows (same `series_key` or same normalised name+town with `is_recurring=true`) and render an "Upcoming dates" list with per-date entry links. This is the bit that justifies keeping the rows separate — users get the schedule, organiser gets every entry URL clicked.

### Slice 5 — Manual override on the event editor

The `is_recurring` checkbox is already on the edit form. Add a "Series key" text input next to it so an admin can manually group rows the detector missed (e.g. branded series across multiple towns).

### Out of scope

- Auto-collapsing series on the home page or in search.
- Generating one synthetic "RunThrough Tatton Park 5k" parent row. The per-date rows are the source of truth from the EA feed; a synthetic parent would drift.
- Cross-series intelligence (e.g. "RunThrough events near you"). Possible later via `series_key`, not now.

## Sequencing & recommendation

Do **Slice 1 + 2 + 3 (badge only)** in one pass. That's the answer to "how do we handle these?" — they get pulled out of the duplicates queue, flagged as recurring, and shown honestly on listings. Slice 4 (schedule on event page) is the high-value follow-up but it's a bigger UI change and can ship next. Slice 5 is a 10-minute add whenever.

Schema change is one nullable text column (`series_key`) + one migration. No data backfill required — Slice 2 populates it as you mark clusters.
