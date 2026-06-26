## Hide thin RunABC events (one-off)

Run a single UPDATE to set `status = 'HIDDEN'` on active, future-dated RunABC events that have neither an `entry_url` nor an `organiser_url`.

```sql
UPDATE events
SET status = 'HIDDEN'
WHERE source = 'runabc'
  AND (entry_url IS NULL OR entry_url = '')
  AND (organiser_url IS NULL OR organiser_url = '')
  AND status = 'ACTIVE'
  AND sort_date >= CURRENT_DATE;
```

Current matching row count: **150** (confirmed via read query).

### Effect
- Those events drop out of `ACTIVE` queries, so they disappear from site search, "other races near you", listing pages, and the homepage.
- They remain in the DB (recoverable by flipping `status` back to `ACTIVE`) — no data loss.
- No code changes. All public surfaces already filter by `status = 'ACTIVE'`.

### Not in scope
- No automated post-import rule. We'll revisit if/when a RunABC import pipeline is added.
- No changes to `event-indexability.ts` (noindex orphan rule stays as-is for any remaining edge cases).
