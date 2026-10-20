# Agent prompt: targeted retry on 81 upcoming races

Copy everything below the line to the research agent, and attach `renm_race_facts_retry_candidates.csv`.

---

You are continuing research-only work for RunningEventsNearMe. Never contact anyone, submit forms, create accounts or bypass access controls.

## Input

`renm_race_facts_retry_candidates.csv` lists 81 upcoming races (20 Oct 2026 – 16 Feb 2027). Each row has `slug`, `race_date`, `reason` and your earlier `agent_notes`. Work in `race_date` order. Do not add other races.

## How to handle each reason

- **page did not load (retry):** make one paced retry of the organiser page and allow time for dynamic content. If it still fails, write `still_unavailable` in the notes and move on.
- **edition not confirmed (retry nearer the date):** look for the organiser's own page that names the race date. Record facts only if the date matches `race_date`. If you only find a different year, write `stale_edition` and record no facts.
- **facts not stated on page:** check the organiser's own linked pages, such as race info, FAQ, entry information or the PDF race pack. Stop at the organiser's own site and the official entry page linked from it.

## Unchanged rules

- Use the same fields as before: start_time, chip_timed, course_profile, total_climb_m, surface, laps, cut_off, min_age, wheelchair_friendly, buggy_friendly, dogs_allowed, canicross, parking, public_transport, ugr_licence, entries_status, course_map_url.
- Every fact needs `source_url`, `checked_at` (the real ISO time of the check, never a future date) and a verbatim `evidence_quote` of at most 200 characters.
- Unknown stays blank. Never write "no" because something isn't mentioned.
- Confidence is `verified` or `plausible_needs_review` only.
- Per-distance values go in the facts file joined with `; ` (for example `Marathon: 09:00; Half: 10:00`). Add one evidence row per part, with exactly the same text as that part.
- Record one evidence row per fact per page, not two quotes for the same fact.
- Never record prices, people's names, contact details or results. Never use aggregators, listings or social media as evidence.
- Respect robots.txt. Make at most 1 request per second per domain.

## Logging (new, required)

- Log every request with its time, URL, robots.txt decision and HTTP status, in a new file called `request_log.csv`.
- In `README.md`, confirm that pacing and robots rules held for the whole run. If they didn't, list where.
- Do not write QC dates later than the time of writing.

## Output

Use the same three files as last time (`race_facts.csv`, `race_facts_evidence.csv`, `README.md`) plus `request_log.csv`. Include only the 81 slugs. In README, give counts per reason: facts found, still unavailable, stale edition, nothing stated.
