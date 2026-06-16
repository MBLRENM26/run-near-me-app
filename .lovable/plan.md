## What's happening

1. **Test data**: The `verify-*` rows in `clubs` are already gone (cleanup ran last session — current count is 0). No action needed.
2. **Slug 500s**: `clubs.slug` has a `UNIQUE` constraint, but `import-clubs.ts` upserts on `norm_id` only. When two different clubs (different `norm_id`) generate the same slug, Postgres throws `23505` and the endpoint returns 500. Need a `-2`, `-3`, … suffix fallback.

## Fix

Edit `src/routes/api/public/import-clubs.ts`:

- After validation, collect each accepted row's candidate slug (`c.slug?.trim() || slugify(c.name) || c.norm_id`).
- Resolve collisions before the upsert:
  1. Query `clubs` for any existing row whose `slug` starts with one of the candidate bases AND whose `norm_id` is NOT in the incoming batch (these are the rows we'd collide with — rows we're updating keep their slug).
  2. Build a `Set<string>` of taken slugs from that query.
  3. For each row, if its candidate slug is in the taken set OR already assigned to an earlier row in the same batch, append `-2`, `-3`, … until free. Add the chosen slug to the taken set.
- Upsert as today.

This handles both DB-vs-batch collisions and within-batch collisions, and leaves the existing slug stable for rows being updated (matched by `norm_id`).

## Then

Republish so the new endpoint is live for Dex's next ingest.

## Notes

- Cleanup migration is not needed — `verify-%` rows are already 0.
- No schema change; pure handler logic.
