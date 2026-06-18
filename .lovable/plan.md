## Why the North Downs Run regressed

On the event page (`src/routes/events.$slug.tsx` ~line 413) the "type" line renders a single value:

```ts
const distance = e.distances?.trim() || e.discipline?.trim();
```

So one text field is doing two jobs. When `distances` was empty we fell through to `discipline` ("multi terrain"). The moment you typed `30k` into `distances`, the same line started showing `30k` and the terrain label disappeared — nothing was lost in the DB, the UI just had only one slot.

The DB already has the right separate fields (`distances`, `discipline`, `distance_tags[]`, `terrain_tags[]`), they just aren't all surfaced.

## Fix (small, ~1 hour)

1. **Expose structured fields in `getEventBySlug`** (`src/lib/events.functions.ts`): add `distance_tags`, `terrain_tags` to the SELECT and to `EventDetail`. Still no `source`/`source_url` (per the link-trust rule).
2. **Replace the single "distance" line with a small facts block** on `events.$slug.tsx`. Each fact is its own row, each only renders if populated:
   - Distance — prefer `distances` text, else humanised `distance_tags`
   - Terrain — from `terrain_tags` (Road / Trail / Multi-terrain / Fell), else `discipline` if it looks like a terrain word
   - Date, Location (already there)
3. **Independent rendering** means: adding `30k` to `distances` no longer hides the terrain tag, because terrain comes from a different field.

That's the whole fix for the regression.

## Pattern for adding rich fields later (elevation, surface, lap count, chip timing, baggage, etc.)

This is the part worth committing to now so it doesn't get messy:

**Schema rule** — every rich field is its own nullable column (or array). Never a free-text "description" that mixes facts.

**Render rule** — every fact renders only when populated; no field depends on another being empty. The facts block is just `[ { label, value, icon } ].filter(v => v.value).map(...)`.

**Verification rule (optional, recommended)** — add one `verified_fields jsonb` column on `events`, shape `{ "elevation_m": { "verified_at": "...", "by": "admin" }, ... }`. The UI shows a small "Verified" tick next to any field present in that map. Scraped values render plain; admin-confirmed values render verified. This is what lets you "show all relevant fields that are verified and populated" without per-field boolean columns sprawling.

**Admin rule** — `_adminShell.admin.events.$id.tsx` already has the tag editor pattern; new rich fields slot in next to it. Saving a field stamps `verified_fields[field] = { verified_at: now() }`.

## Complexity

- Immediate fix: tiny — one server fn SELECT, one render block, no migration.
- Rich-fields pattern: low — one `jsonb` column + a `<Fact>` component. Each new field after that is ~3 lines (column + admin input + fact row).
- No new tables, no new routes, no new packages.

## Out of scope for this plan

Actually adding elevation/surface/etc. columns — call those out when you want them and I'll add them one by one under this pattern.

## Technical detail

- Files touched: `src/lib/events.functions.ts` (SELECT + type), `src/routes/events.$slug.tsx` (facts block), optionally a new `src/components/events/EventFacts.tsx`.
- Migration: none for the fix; one `ALTER TABLE events ADD COLUMN verified_fields jsonb DEFAULT '{}'::jsonb` if you want the verification layer now.
- Honours `mem://constraints/no-source-attribution` — no `source`/`source_url` added to the public SELECT.
