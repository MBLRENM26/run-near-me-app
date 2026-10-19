# Race facts research brief, then club links on monthly lists

## Step 1: Research brief (ready to copy now)

Once approved, this brief is also saved to Files as `renm_race_facts_research_brief.md`.

---

**Role:** You are a research-only agent. Never contact anyone, sign up for anything, or submit forms.

**Input:** `renm_upcoming_race_websites.csv` (same file as the organiser run). Use `slug` as the join key. Do races in the next 120 days first, then the rest.

**For each race, find these facts, but only from the organiser's own race page or the official entry page for this year's edition:**

| field | allowed values |
|---|---|
| start_time | HH:MM (24h), plus the start time for each distance if they differ |
| chip_timed | yes / no |
| course_profile | flat / undulating / hilly, only if the page says so in words |
| total_climb_m | number, only if stated (convert feet to metres and note the conversion) |
| surface | road / trail / mixed / fell / track / grass |
| laps | number of laps, or "point_to_point" or "out_and_back" |
| cut_off | time limit, if stated |
| min_age | minimum age, if stated |
| wheelchair_friendly / buggy_friendly / dogs_allowed / canicross | yes / no, only if stated |
| parking / public_transport | short factual note, max 120 characters |
| ugr_licence | yes / no, plus the permit number if shown |
| entries_status | open / closed / sold_out / waiting_list / not_yet_open |
| course_map_url | Plotaroute, Garmin, Strava route or GPX link on an official page |

**Rules**
1. Every fact must have `source_url`, `checked_at` (ISO time), and `evidence_quote` (verbatim, max 200 characters).
2. Unknown is better than wrong. Leave a field blank rather than infer it. Don't guess "flat" from a riverside location, and don't take a start time from last year.
3. Edition check: the quote must match this year's date. If the page shows an older year, put `stale_edition` in the notes and leave the facts blank.
4. Confidence is `verified` (stated plainly on an official page) or `plausible_needs_review`. Nothing else.
5. Never record entry fees, prices, runner names, results, or any personal email or phone number.
6. Aggregator sites and listing sites are never a source. Entry platforms count only for entries_status and start_time.
7. Respect robots.txt, make at most 1 request per second per domain, and use a polite user agent.
8. Note any "no reproduction" or copyright statement next to course maps.

**Output**
- `race_facts.csv`: one row per race. Columns: slug, then each field above, then source_url, checked_at, confidence, notes.
- `race_facts_evidence.csv`: one row per fact. Columns: slug, field, value, evidence_quote, source_url, checked_at, confidence.
- `README.md`: counts filled per field, races skipped and why, and any problems.

---

## Step 2: Club links on monthly race lists (built after approval)

- Each monthly list gets a "Clubs hosting races this month" block. It shows only clubs that are confirmed as a race's host, which are the club-matched races from the agent data after review.
- It also gets a "Running clubs in this region" link to the existing club pages, for region-filtered views.
- The block only shows counts and names that are stored. It has no written filler.

## Later (separate approval)

- Somewhere to store the race facts from Step 1, so that monthly lists can show counts like "12 chip-timed, 4 flat".
- Met Office month climate facts.

## Technical notes

- The Step 1 facts map onto new fields that would sit in a separate, approved change. Nothing is written to events from the research file without review through the existing source-research queue.
- Step 2 reads accepted host-club links in the same way as `club-races.server.ts`. The counts go through `month-summary.ts`.
