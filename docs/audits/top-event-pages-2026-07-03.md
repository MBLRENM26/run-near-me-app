# Top event pages audit — 2026-07-03

Sample: top 8 event pages by Plausible pageviews (last 30d) + 12 next-soonest active events with slugs. n=20.

## Per-page coverage

| Slug | County | Sort date | Source | Org line? | Trust? | Extra links | Same-weekend (raw) | Other-by-org |
|---|---|---|---|---|---|---|---|---|
| brands-hatch-10k-longfield-2026 | Kent | 2026-07-03 | — | ✗ | ✗ | 0 | 0 | **5** |
| cock-crow-5k-jarrow-and-hebburn-ac | Tyne & Wear | 2026-06-30 | england-athletics | ✗ | ✓ | 1 | 2 | 0 |
| dk-mile-series-2026-2026-07-03 | Northumberland | 2026-07-03 | england-athletics | ✗ | ✓ | 1 | 2 | 0 |
| donfaster-5k-2026-07-03 | S. Yorkshire | 2026-07-03 | england-athletics | ✗ | ✓ | 0 | 1 | 0 |
| epsom-oddballs-2000-perch | Surrey | 2026-07-03 | england-athletics | ✗ | ✓ | 0 | **3** | 0 |
| essex-way-ultra-tra | — | 2026-07-03 | tra | ✗ | ✓ | 1 | n/a (no county) | 0 |
| great-bentley-friday-5-2026 | Essex | 2026-07-03 | england-athletics | ✗ | ✓ | 0 | 2 | 0 |
| littondale-4-mile-road-race | N. Yorkshire | 2026-08-08 | england-athletics | ✗ | ✓ | 0 | 0 | 0 |
| meteor-mile | Gloucestershire | 2026-08-28 | england-athletics | ✗ | ✓ | 0 | 0 | 0 |
| phoenix-fridays-run-for-a-tenner-july-tra | — | 2026-07-03 | tra | ✗ | ✓ | 1 | n/a (no county) | 0 |
| sale-sizzler-2026-07-03 | Greater Manchester | 2026-07-03 | england-athletics | ✗ | ✓ | 0 | 0 | 0 |
| sale-sizzlers-5k-race-2 | Greater Manchester | 2026-07-03 | runabc | ✗ | ✓ | 0 | 1 | 0 |
| stone-st-michaels-10k-2026-06-21 | Staffordshire | 2026-06-21 | england-athletics | ✗ | ✓ | 0 | 1 | 0 |
| sunnyhill | — | — | parkrun | ✗ | ✓ | 0 | n/a (no county) | 0 |
| the-descent | North | 2026-07-03 | runabc | ✗ | ✓ | 0 | 2 | 0 |
| the-morley-5k-youth-fun-run | W. Yorkshire | 2026-07-12 | england-athletics | ✗ | ✓ | 0 | **3** | 0 |
| the-not-ulley-res | S. Yorkshire | 2026-06-17 | england-athletics | ✗ | ✓ | 0 | 2 | 0 |
| the-sobo-five | Dorset | 2026-07-03 | england-athletics | ✗ | ✓ | 0 | 0 | 0 |
| whissendine-6ix | Rutland | 2026-07-03 | runabc | ✗ | ✓ | 0 | 0 | 0 |
| wyre-forest-trail-half-marathon-10k-2026 | Worcestershire | 2026-06-28 | england-athletics | ✗ | ✓ | 1 | 0 | 0 |

Rendering thresholds in code: `same-weekend >= 3` and `other-races-by-org >= 2 AND matched club`.

## Empty-block summary

- **"Organised by" resolves: 0/20 (0%)** — `events.organiser` is NULL on 19/20. DB-wide: only 729/5234 (14%) of active events have any organiser string. England Athletics feed doesn't populate it, so every EA-sourced event dead-ends here.
- **Trust strip renders: 19/20 (95%)** — only the Nice Work-listed brands-hatch row has NULL source. Working as intended.
- **"Useful links" (≥1 extra distinct domain): 5/20 (25%)** — EA rows typically have entry_url = organiser_url = same englandathletics.org page.
- **"Same weekend nearby" renders (≥3): 2/20 (10%)** — median raw count is 1. 3/20 sit at exactly 0 despite having county+date. 3/20 (TRA/parkrun) can't render at all — no county.
- **"Other races by organiser" renders (≥2 + club match): 0/20 (0%)** — blocked by the organiser-nullness above.

## Verdict

The Phase-1 onward-journey blocks are shipping to almost nobody on our top pages:
- **Organiser line** and **other-races-by-org**: blocked at the root by missing `events.organiser`. Not a bug in the block — a data-coverage problem in the EA feed.
- **Same-weekend-nearby**: renders on 10% of pages. Threshold of 3 is too aggressive for the density we have.
- **Useful links** and **Trust strip**: working, low-value on their own.

## Recommended follow-ups (not in this PR)

Ranked by likely impact per effort:

1. **Widen `sameWeekendNearby` fallback: county → region if county returns < 3.** Regions have ~10× the density. Would lift the 10% render rate materially. Small code change.
2. **Extract organiser from the EA feed.** The EA source almost certainly carries a hosting club per event; we're just not persisting it. Needs a look at the sync payload (`src/lib/sync-england-athletics.server.ts`). Would unlock the organiser line AND other-races-by-org for the 4,900+ EA events at once.
3. **Fuzzy club match**: `Jarrow & Hebburn AC` vs `Jarrow and Hebburn AC` etc. — do slugified LIKE / trigram match once organiser is populated. Lower priority; only useful after (2).
4. **Consider dropping the ≥3 threshold on same-weekend-nearby** to ≥1 with a "nearby this weekend (n)" label. Cheap, but risks looking sparse.
