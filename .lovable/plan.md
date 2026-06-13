## Step 1 — Rotate `IMPORT_SECRET` (build mode, ~30s)

The Lovable Cloud secrets UI is intentionally write-only after creation (the value is encrypted and even the platform can't read it back — only delete or overwrite). Cleanest path: **update** it. Same env var name, no code changes needed, you set the new value yourself.

I'll call `secrets--update_secret` for `IMPORT_SECRET` — a secure form pops up, you type a new value, save. Then use that value in the `x-import-secret` header for your 128-row payload.

## Step 2 — Send the Wales / NI payload

Endpoint reference (already in `src/routes/api/public/import-events.ts`, no changes needed):

```
POST https://runningeventsnearme.com/api/public/import-events
Headers: Content-Type: application/json
         x-import-secret: <new secret>
Body:    { "events": [ ...up to 1000 rows ] }
```

Required per row: `norm_id` (unique upsert key — prefix by source, e.g. `welshathletics-<slug>`) and `name`. Strongly recommended: `date_from` (`YYYY-MM-DD`), `town`, `county`, `country` (`"Wales"` or `"Northern Ireland"`), `lat`/`lng`, `distances`, `entry_url`, `source`. Server auto-fills `region` (from county/coords), `sort_date`, `is_upcoming`. Re-sending same `norm_id` updates the row — safe to re-run.

Smoke test first with 1 row, expect `{ "ok": true, "received": 1, "written": 1 }`, then send the full 128.

## Step 3 — Sequencing the GSC-driven work

You've said event pages are the strongest GSC signal. That's the right read — those pages are concrete, low-competition long-tail (`pete-shields-ilkley-10k` = exactly one searcher intent), and you have 5K+ of them. Region/distance hubs come next, but **only after** event pages are converting impressions → clicks well, because hubs win by linking *to* good event pages.

Recommended order, in scope for this phase:

### 3a. Event-page CTR & rich-result polish (1-2 sessions)
Already-ranking pages with low CTR are the fastest wins — no new content needed.
- **FAQ schema** on event pages: "When is X? Where? How far? How do I enter?" — answers pulled from existing structured fields only (no AI prose, per memory). Earns FAQ rich result = bigger SERP footprint.
- **Title-tag A/B**: current is `{Name} {Year} — {Date}, {Town} | Entry & Info`. Test variants like `{Name} {Year} | {Distance} in {Town}, {Date}` — distance-in-title matches more queries.
- **Internal linking from event → event**: the "More 10Ks in Yorkshire" block already exists. Add a sibling "Other races in {Town}" block where ≥3 events share a town. Distributes link equity, increases pages/session.
- **Last-updated timestamp** in visible copy + JSON-LD `dateModified` — Google rewards freshness signals for event content.

### 3b. Hub-page targeting (2-3 sessions, *after* 3a ships and we've watched GSC for 1-2 weeks)
- Pull GSC top-queries for hubs, find the gap (e.g. "trail running events yorkshire" vs current page).
- Unique intro copy per region+distance combo (templated from DB counts/months, no slop).
- Internal links from event pages back to relevant hubs (you already do region; add distance hub link).

### 3c. Wait-and-see (do NOT build yet)
- **Organiser claim-flow + image upload** — needs auth, account model, moderation. Premature until you have ~50 organiser inbound requests. Distance-fallback images get the same SEO benefit in 1 hour.
- **Email digest** — needs reliable user base + frequency policy. Defer until you have signed-up users to digest *to*.
- **More scraper sources** — you can absorb Welsh/NI manually for now; automate when manual import gets painful (3+ updates/month).

## Push-back / what I'd resist

If the urge is to "add a feature" (auth, accounts, digests, maps), I'd push back — the data says **the existing event pages are working and underexploited**. Squeeze them first. Every hour on CTR and rich results compounds across 5,575 pages; every hour on a new feature serves zero traffic until adoption.

## Technical notes

- FAQ schema lives in the same `head()` block as the existing Event JSON-LD in `src/routes/events.$slug.tsx`. No new files.
- "Other races in {Town}" needs a new query in `events.functions.ts` (similar pattern to existing `related`).
- All copy must remain templated from structured fields per `mem://constraints/scraped-data-trust`.

## Out of scope for this plan

I'll handle Step 1 (rotate secret) in build mode immediately on approval. Step 2 is yours (curl from your machine). Step 3a-3c are separate plans — approve this one, run your import, then we'll plan 3a once you confirm.
