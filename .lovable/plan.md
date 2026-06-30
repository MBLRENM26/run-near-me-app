## Indexability diagnostic endpoint

Add a single admin-only JSON endpoint that returns counts by noindex reason across all events, so we can sanity-check the live population against GSC's reported numbers over the next few weeks.

### Endpoint

`GET /api/public/admin/indexability-stats`

Auth: `x-admin-secret` header matched against `process.env.IMPORT_SECRET` (same pattern as `fix-event-urls.ts`).

### Implementation

New file: `src/routes/api/public/admin/indexability-stats.ts`

1. Load `supabaseAdmin` inside the handler.
2. Select `id, slug, name, sort_date, entry_url, organiser_url, organiser` from `events` where `status = 'ACTIVE'`. (No source filter — we want the same universe `getIndexableEventSlugsForSitemap` sees.)
3. Replicate the sibling-grouping logic from `events.functions.ts` lines ~166–195: group rows by `normaliseEventName(name)`, then run `computeIndexability(row, siblings, today)` per row.
4. Tally:
   - `total` (all ACTIVE)
   - `indexable`
   - `noindex_total`
   - `noindex_by_reason`: `{ past, "slug-suffix-duplicate", orphan, "duplicate-sibling" }`
   - `sitemap_count` — should equal `indexable` (cross-check)
5. Return `Response.json({ today, total, indexable, noindex_total, noindex_by_reason, sitemap_count })`.

### Expected output shape

```json
{
  "today": "2026-06-30",
  "total": 6200,
  "indexable": 5830,
  "noindex_total": 370,
  "noindex_by_reason": {
    "past": 46,
    "slug-suffix-duplicate": 180,
    "orphan": 95,
    "duplicate-sibling": 49
  },
  "sitemap_count": 5830
}
```

Comparing `noindex_total` against GSC's 323 soft-404 number tells us:
- If `noindex_total >= 323` → we've covered the GSC set; just wait for recrawl.
- If `noindex_total < 323` → some flagged URLs slip through the rules; pull GSC's URL list and audit.

### Out of scope

- No UI. Curl-only.
- No per-URL listing (would be huge; if needed later, add `?reason=orphan&limit=50` follow-up).
- No schema or `event-indexability.ts` changes.

### Verification

Curl the endpoint after deploy with `x-admin-secret`, check counts are non-zero across all four reasons, confirm `sitemap_count` matches the live `<url>` count in `/sitemap.xml` (currently 5,830).
