# Scottish Athletics planner — pinned-slug fix (amended)

## Fix

Edit `src/lib/sync-scottish-athletics-plan.ts` size-1 branch.

1. Replace `existingSlugByNormId: Map<norm_id, slug>` with `existingPinByNormId: Map<norm_id, { slug, norm_id, ref, dateFrom }>`. `ref` is `parseJustGoRef(source_url)` at index-build time.
2. In the size-1 branch, compute `baseNormId` and look up the pin. Reuse the pinned `slug` / `norm_id` **only when both** the incoming record's parsed ref **and** `dateFrom` equal the pinned row's `ref` and `dateFrom`. If the incoming ref is missing, or the ref or date differ, treat as unpinned and fall through to the normal deterministic slug-resolution path (`baseSlug` → date suffix → numeric suffix, consulting `globalSlugOwners` and `seenSlugsInBatch`).
3. The pre-upsert slug / norm_id assertions remain unchanged so any residual collision still fails loud.

No other logic changes. Collision-group branch, shared-ref guard, cross-source dedupe, feed-level ref dedupe, and fail-loud on unparseable ref in collision groups are all preserved.

## Tests (`src/lib/sync-scottish-athletics-plan.test.ts`)

Add three regression tests alongside the existing 10:

1. **Same slugified name, different dates, one matching pin** — feed has record A (ref R1, date D1) and record B (ref R2, date D2). Existing row: `{ slug: base, norm_id: sa-base, ref: R1, date_from: D1 }`. Expect A keeps `slug=base` / `norm_id=sa-base`; B gets a distinct resolved slug (`${base}-${D2}` or a numeric suffix), no assertion.
2. **Same name and same date, different incoming ref** — feed has record with ref R2. Existing row: `{ slug: base, norm_id: sa-base, ref: R1, date_from: D1 }`. Expect the incoming record does **not** inherit `base` / `sa-base`; it gets a distinct resolved slug, no assertion.
3. Retain the existing "malformed ref inside collision group fails loud" test unchanged.

## Verification steps

1. `bunx tsgo --noEmit` — clean.
2. `bunx vitest run src/lib/sync-scottish-athletics-plan.test.ts` — 12 passing (10 original + 2 new; the third is the pre-existing malformed-ref test retained).
3. Trigger one production run of `/api/public/admin/sync-scottish-athletics`. Return: new `sync_runs` row (id, timestamps, fetched, active, written, new_events, updated_existing, skipped_dupes, skipped_no_date, error_message).
4. Verify DB post-run:
   - Peterhead: two rows for `7F23…` ref intact with slugs `peterhead-3k-junior-mile-series-2026` and `peterhead-3k-junior-mile-series-2026-2026-09-26`, plus any new second-date Peterhead row with a distinct slug.
   - Whitetops Hill Race: both existing rows (`whitetops-hill-race` ACTIVE, `whitetops-hill-race-2026-06-26` DUPLICATE) unchanged.
   - Barrathon Junior Fun Runs: both existing rows (`barrathon-junior-fun-runs` ACTIVE, `barrathon-junior-fun-runs-2026-06-27` DUPLICATE) unchanged.
   - All five shared-ref legacy pairs (3k on the Green, Nairn Half Marathon 2026, Kinloss Running Festival, Peterhead 3k Junior Mile Series 2026, BLAST 5k Series the Meadows 2026) still have exactly the same two rows / slugs / norm_ids per ref.
5. If run 1 is clean, immediately trigger a second production run and confirm: `success`, no `events_slug_unique_idx` error, no `ON CONFLICT DO UPDATE command cannot affect row a second time` error, and the same collision + legacy-pair state after run 2.

## Out of scope

Organiser-URL gap, legacy DUPLICATE cleanup, changes to the ACTIVE-only existing-rows query.
