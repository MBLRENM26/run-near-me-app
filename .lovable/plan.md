## 1. Within-batch slug collision — already handled

Re-read of `src/routes/api/public/import-clubs.ts` (lines 128-147):

```ts
const taken = new Set<string>();
for (const r of existing ?? []) {
  if (!normIds.includes(r.norm_id) && r.slug) taken.add(r.slug);
}

const rows = draft.map(({ row, baseSlug }) => {
  let slug = baseSlug;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${baseSlug}-${n}`.slice(0, 120);
    n += 1;
  }
  taken.add(slug);   // ← reserves this slug for the rest of the batch
  ...
});
```

Because each resolved slug is added to `taken` before the next row is processed, two rows in the **same batch** with the same `baseSlug` (e.g. two "Edinburgh AC" entries) will deterministically get `edinburgh-ac` and `edinburgh-ac-2`. No fix needed for Scottish / Welsh / NI ingests — the same logic protects them.

Cross-batch collisions are also covered: by the time batch N+1 runs, batch N's slugs are in the DB and the `OR` lookup pulls them into `taken`.

**One latent risk worth flagging (not fixing now):** the lookup uses `.or(slug.eq.X,slug.like.X-%)` across every baseSlug in the batch. With 500 rows that OR-list is large and, more importantly, the response itself is subject to PostgREST's row cap — see point 2.

## 2. `db-max-rows = 100` — not set in this project, and you don't want it at 100

There is no `db-max-rows` in `supabase/config.toml` or anywhere else in the repo. Lovable Cloud's PostgREST runs at its platform default (effectively uncapped for our purposes; certainly not 100).

If it *were* set to 100, the slug-collision lookup in `import-clubs` would silently truncate at 100 existing rows for a 500-row batch — meaning duplicate slugs could slip through and the `upsert` would fail on the unique index. Same risk applies to any admin list/search server fn that does a single `.select()` expecting >100 rows.

**Recommendation:** leave it unset (current state). If you ever want a global safety cap, set it to something like 10,000 — but explicitly raise/paginate the import-clubs lookup before doing so.

## Action

Nothing to change. Both items are already in a good state — answering the questions, not editing code.