# Reconcile `events` fingerprint drift (3c3abf25… → 6321a7d5…)

Read-only. No schema, data, RLS, grant, RPC, seed, or public-code changes. Result is an audit record, not a migration.

## Objective

Explain why the two captured `public.events` fingerprints differ despite identical row counts (7,318), and only then agree a canonical query + hash as the durable baseline for future ORL work.

## Step 1 — Recover the exact SQL used for each capture

Return, side by side:

- **3c3abf25…** (recorded in `mem://audits/orl-closeout-2026-07-17.md`): the exact query text, timestamp, DB role and schema search_path used.
- **6321a7d5…** (this turn): confirmed as
  ```sql
  SELECT md5(string_agg(t::text, '' ORDER BY id)) FROM public.events t;
  ```
  run against `public` as `postgres` via managed psql on 2026-07-17.

If the prior SQL text cannot be recovered verbatim from the audit note, record that as a limitation and treat Step 2's canonical rerun as the sole source of truth.

## Step 2 — Run the agreed canonical query twice, back-to-back

Adopt the user-proposed canonical form (row-level md5 then aggregate; robust to `t::text` whitespace quirks):

```sql
SELECT md5(
  string_agg(
    md5(to_jsonb(e)::text),
    ',' ORDER BY e.id
  )
) AS events_full_row_hash
FROM public.events e;
```

Run it twice within ~30s. Both runs must return the identical hash to prove stability at rest. Record hash, row count, timestamp, and DB role for each run.

## Step 3 — Explain the drift

Two, and only two, admissible explanations:

1. **Different serialisation.** The old capture used a different expression (`t::text` vs `to_jsonb(e)::text`, different ORDER BY, no ORDER BY, different delimiter, or a subset of columns). If Step 1 shows the SQL differed, that alone explains the drift and no data-change investigation is required.

2. **Intervening writes.** If Step 1 shows identical SQL, drift means one or more existing rows changed between captures. Enumerate write paths that ran in the window between 2026-07-16 close-out and now, using read-only queries only:

   - Recent `events.updated_at` distribution (max, top 20 by `updated_at DESC`, count where `updated_at >` prior-capture timestamp).
   - Recent `sync_runs` rows in that window (source, started_at, upserted/updated counters). The SA reliability patch's two production sync runs this turn are the primary candidates — 5 inserts + 93 updates on run 1 already documented.
   - Any `event_edits` rows in the window.
   - `status`, `duplicate_of`, `sort_date` distributions unchanged vs the audit note's focused counts (row count 7,318 already matches).

Attribute the drift to the specific write path(s) identified. Do **not** assert ORL caused any of it — the ORL migration wrote zero rows to `events` and the corrective migration this turn was constraint-only.

## Step 4 — Record the canonical baseline

Append to `mem://audits/orl-closeout-2026-07-17.md` (or a new dated note if the closeout is considered frozen):

- Canonical query text (verbatim, from Step 2).
- Canonical hash from the second identical run.
- Row count, timestamp, DB role, schema.
- Reconciliation outcome from Step 3 (SQL differed / rows changed / limitation recorded).
- Statement that all future ORL migrations and seed applies must capture pre + post using **this** canonical query.

Retire the two ad-hoc hashes (`3c3abf25…`, `6321a7d5…`) from future comparisons; they are historical artefacts, not baselines.

## Explicitly out of scope

- No CSV drafting, seed parser, or Phase 1 validation.
- No changes to constraints, grants, RLS, RPCs, defaults, routes, or event data.
- No attempt to "reverse" or explain individual field-level diffs beyond identifying the responsible write path.

## Deliverable

A single evidence block containing: recovered prior SQL (or limitation), two identical canonical-hash runs, drift explanation (SQL vs writes vs limitation), and the memory-note update text. After that lands, seed-interface scoping resumes.
