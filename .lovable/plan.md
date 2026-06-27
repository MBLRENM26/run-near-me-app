## Terrain tag backfill — 1,703 ACTIVE events

Cheap, well-scoped: one read (dry-run) + one migration (apply). Fits in ~2-2.5 credits.

### Step 1 — Dry-run report (read-only, ~0.5 credit)

Run `parseEventTags` logic in SQL against the 1,703 ACTIVE rows where `terrain_tags` is null/empty, using `name` + `distances` + `discipline`. Report:

- How many rows get ≥1 terrain tag from the parser
- Breakdown of newly-assigned tags (road / trail / fell / multi-terrain / parkrun / …)
- How many remain untaggable (truly ambiguous names like "Bob's 10k") — these stay null

### Step 2 — Apply migration (~1.5-2 credits)

Single UPDATE migration that sets `terrain_tags` on the rows the parser can classify. Mirrors the existing `parseEventTags` regex rules in SQL (or calls a one-shot server fn that batches updates):

- `discipline` exact match → terrain (road race → road, trail race → trail, hill running → fell, …)
- name/distances regex fallback (trail, fell, multi-terrain, parkrun, cross-country, obstacle, track, road)
- Skip rows where `is_curated_tags = true`
- Leave `distance_tags` alone (separate concern, can be a follow-up)

### Out of scope (to keep cost down)

- Re-parsing already-tagged rows
- Distance tag backfill (different pass, more error-prone)
- Touching the 201 HIDDEN rows
- Any UI changes

### Verification

Re-run the original tag-coverage query — expect "no terrain tag" count to drop from 1,703 to whatever the dry-run predicted as untaggable.

Approve and I'll run the dry-run first, share the breakdown, then apply.
