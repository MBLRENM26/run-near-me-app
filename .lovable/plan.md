## Merge 19 RunABC → TRA duplicates

TRA wins on every axis (licensed, entry fee, trail discipline, organiser URL). The only snag is slugs: RunABC currently holds the clean slug (e.g. `bishop-wilton-beast`) and TRA has the ugly `-tra` suffix. We want the clean slug to survive on the TRA row so existing inbound links / GSC impressions transfer cleanly.

### Steps (single SQL transaction via insert tool)

For each of the 19 pairs:

1. **Free up the clean slug** — rename the RunABC row's slug to `<slug>-runabc-archived` so the unique index won't block step 3.
2. **Mark RunABC row as duplicate + hidden** — set `status = 'HIDDEN'`, `duplicate_of = <tra_id>`.
3. **Promote TRA row to the clean slug** — set TRA's `slug = <original runabc slug>` and `discipline = 'Trail Race'` (no-op if already set).

`entry_fee` is already on the TRA rows, so no copy needed.

### Why HIDDEN, not DELETE on RunABC

Matches existing pattern (admin duplicates merge marks rows as duplicates rather than hard-deleting). Keeps audit trail and lets us reverse if a merge was wrong.

### Verification after run

```sql
-- Should return 0
SELECT count(*) FROM events t
JOIN events e ON LOWER(TRIM(t.name)) = LOWER(TRIM(e.name))
  AND t.date_from = e.date_from
  AND t.source = 'tra' AND e.source != 'tra' AND e.status = 'ACTIVE'
WHERE t.status = 'ACTIVE';

-- Should show 19 rows, all clean slugs, source=tra, discipline='Trail Race'
SELECT slug, name, source, discipline, entry_fee FROM events
WHERE id IN (<19 tra ids>);
```

### Out of scope

- Touching the other ~268 newly-imported TRA rows (no duplicates flagged).
- Changing the duplicate-detection logic itself — the admin duplicates UI already covers this via name+date+source heuristics; this is just a one-shot cleanup for the batch you just imported.
- Reslugging TRA rows that don't have a RunABC twin (their `-tra` slug stays).

Approve and I'll run the UPDATE in one transaction.
