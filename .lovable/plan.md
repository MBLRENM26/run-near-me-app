## Correction noted

You're right — checked the row directly:

```
name:        North Downs Run 2026
distances:   30K
discipline:  Multi-Terrain Race
```

The terrain classification lives in `discipline`, not `distances`. That changes the parser inputs but actually **strengthens the case for normalisation**, because it reveals a second, parallel free-text field that the current distance-page filters ignore entirely. Distribution across the live catalogue:

```text
discipline                          rows
(null)                              1787
Road Race                            555
Multi-Terrain Race                   213
Road Race / Multi Terrain             76
Trail Race / Ultra Distance           13
Hill Running                           8
Road                                   2
Cross Country                          1
```

So today there are **289 events** (213 + 76) whose only terrain signal is `discipline = "Multi-Terrain ..."`. None of them surface on the Trail page unless `distances` *also* contains "trail" — which it usually doesn't. That's the same class of omission as North Downs Run 2026, just at scale.

## What changes in the plan

The normalisation slice is otherwise identical to what you approved. Only the parser inputs and a couple of helper details change:

### Parser is multi-source, not just `distances`

```ts
parseEventTags({
  name,         // "North Downs Run 2026"
  distances,    // "30K"
  discipline,   // "Multi-Terrain Race"
}): { distance_tags, terrain_tags }
```

Resolution order:

- **`distance_tags`** read primarily from `distances`, with `name` as a fallback for cases like `"London Marathon"` where the distance lives in the title.
- **`terrain_tags`** read primarily from `discipline`, then `distances`, then `name`. The mapping for the known `discipline` values is exact and unambiguous:

```text
"Road Race"                  → ["road"]
"Road"                       → ["road"]
"Multi-Terrain Race"         → ["multi-terrain"]
"Road Race / Multi Terrain"  → ["road", "multi-terrain"]
"Trail Race / Ultra Distance"→ ["trail"]   (ultra is a distance, not a terrain)
"Hill Running"               → ["fell"]
"Cross Country"              → ["cross-country"]   (new tag, see below)
null                         → fall through to distances/name
```

Free-text `distances` continues to contribute terrain when it says "Trail", "Fell", "Multi-Terrain", "Obstacle", "Night Trail", etc.

### Tag vocabulary tweak

Add `cross-country` to the `terrain_tags` enum so the single existing row isn't lost. Doesn't need its own page yet — the tag just preserves the signal for future filters.

`ultra` stays a **distance** tag (correct interpretation of `"Trail Race / Ultra Distance"` → distance `ultra`, terrain `trail`), not a terrain.

### Trail page now genuinely catches everything

After backfill, the South East Trail page query becomes:

```sql
WHERE region = 'South East'
  AND terrain_tags && ARRAY['trail','multi-terrain','fell']
```

…and picks up:

- `Maverick North Downs Trails` (terrain from `distances = "Trail"`)
- `North Downs Run 2026` (terrain from `discipline = "Multi-Terrain Race"`)
- every other Multi-Terrain Race in the region currently missing

Whether `multi-terrain` belongs on the Trail page by default is a content decision — defensible either way. Default to including it (matches how runners search) and expose a dedicated `/multi-terrain-running-events` page in a later slice if we want to split them.

### Admin editor reflects both axes

Two multi-selects in the editor:

- **Distance tags** — checkbox group bound to `distance_tags`.
- **Terrain tags** — checkbox group bound to `terrain_tags`.

Raw `distances` and `discipline` stay editable text fields above them (source-of-truth display strings). Saving sets `is_curated_tags = true` so the parser leaves the row alone on future scraper runs.

The admin list gains an "Untagged terrain" filter (`cardinality(terrain_tags) = 0`) so the 1787 currently-null-discipline rows can be triaged.

## Everything else from the previous plan is unchanged

- Schema migration: add `distance_tags text[]`, `terrain_tags text[]`, `is_curated_tags boolean`, two GIN indexes. No new RLS.
- Sequencing: Slice 2 (Add new event) → this normalisation → Slice 3 (CSV import into normalised columns).
- Backfill runs as a server function calling the same TypeScript parser. Idempotent.
- Scrapers + `import-events.ts` call the parser on write.
- `DISTANCE_PAGES` config swaps `includes`/`excludes` strings for a `{ distanceTags?: string[]; terrainTags?: string[] }` shape.
- Out of scope: town normalisation, splitting multi-distance events into child rows, dedicated multi-terrain page.

## Verification adds one case

Backfill `North Downs Run 2026` and confirm:

```text
distance_tags = {30k}        (parser learns "30K" → "30k")
terrain_tags  = {multi-terrain}
```

…then the South East Trail page returns it with no manual edit required. The manual editor is only needed for rows where both `distances` and `discipline` are silent on terrain.
