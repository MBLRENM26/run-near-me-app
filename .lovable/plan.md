# TBC date refresh + targeted edits

One `supabase--insert` data-change covering everything below. No schema changes.

## 1. CSV bulk date backfill (108 rows)

For every `id` in `July TBC — 108 dates to update.csv`, set:

- `date_from`  = `found_date`
- `date_to`    = `found_date`
- `sort_date`  = `found_date`
- `date_raw`   = `to_char(found_date, 'FMDay, FMDD FMMonth YYYY')` → e.g. `Sunday, 5 July 2026`
- `date_is_estimated` = `false`
- `updated_at` = `now()`

3 `past_confirmed` rows handled the same way — `status` stays `ACTIVE`, search filters them out via `sort_date >= CURRENT_DATE`.

Implementation: single `UPDATE events SET ... FROM (VALUES (id, found_date), ...) AS v(id, d) WHERE events.id = v.id::uuid`.

## 2. Individual date corrections

| Event | ID | New date |
|---|---|---|
| Hampton Court Palace 10K | `43a9e5ff` | 2026-10-11 |
| Hyde Park 5K & 10K (One Race) | `1dd53e5b` | 2026-09-26 |
| Regent's Park 5K & 10K | `1a7a728a` | 2026-06-27 |

Same six fields as section 1 (incl. `date_is_estimated = false`, regenerated `date_raw`).

## 3. Richmond — no action needed on existing rows

- **RunThrough Richmond Park Half (28 Jun 2026)** already exists as `a26062aa` with the correct date — leave as-is.
- **RNLI Half Marathon Richmond** (`06dacc5a`) — you can't find it on the web, it's estimated, no source. **Set `status = 'HIDDEN'`** rather than guess a date. Confirm if you'd prefer to keep it ACTIVE estimated instead.
- One Race "Richmond 7 June 2026" version — no matching row in DB; **not created** in this run (creating new events is out of scope here; flag if you want a follow-up to add it).

## 4. Status → HIDDEN

| Event | ID |
|---|---|
| East Finchley Half Marathon | `e6cd197f` |
| Tempos Summer 5K Series Race 4 | `405be6ce` |
| Titan Ultra Fest | `d0fd90f5` |
| Burton & District Triathlon Festival (closest match to "Trail Festival") | `213329d3` |
| RNLI Half Marathon Richmond (see §3) | `06dacc5a` |

## 5. Town corrections

| Event | ID | New town |
|---|---|---|
| Wild One | `c35a5653` | Worcester |
| Swan Challenge | `07f9ce3f` | Coombe Abbey Park |
| Whitemoor 5 Miler | `d81e3292` | March |

(Ultra 5K Kempston `e44dbf10` and Timber Trails Bromsgrove `b52dfa4e` already have correct towns — no UPDATE needed for town.)

## 6. Duplicate flags

| Keep (canonical) | Mark as duplicate_of canonical |
|---|---|
| Ultra 5K Kempston `e44dbf10` | `da6547b8` (Ultra 5K Dereham row) → `status='DUPLICATE'`, `duplicate_of = e44dbf10` |
| Timber Trails Bromsgrove `b52dfa4e` | `7264fcf1` (Coalville row) → `status='DUPLICATE'`, `duplicate_of = b52dfa4e` |

## 7. Timber Trails date

Set canonical `b52dfa4e` to **2026-07-05** (all six date fields per §1 pattern).

---

## Out of scope / flagged for follow-up

- Creating a new One Race "Richmond Park 7 June 2026" row.
- Hyde Park / Richmond — only one organiser kept per location as you instructed; if other organisers should also be listed, that's a separate add-event task.
- Burton & District **Trail** Festival — only the Triathlon Festival exists in DB; if Trail is a real distinct event, it would need to be added.

Reply "go" and I'll execute as one `supabase--insert` data change.