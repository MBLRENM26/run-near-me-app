## Answer to your question

Right now `events.organiser` is just a text column. The event page renders "Organised by {events.organiser}" as plain text and "Other races by organiser" does an `ilike` on that string — no link to the club page even when the name matches one in `clubs`.

You're right that a link to the club page is worth much more than a bare text string. So the plan does **both**: populate `events.organiser` with the matched club name, AND add a new `events.organiser_club_id` FK so the UI can link "Organised by {name}" → `/running-clubs/{slug}`.

## Part 1 — Schema

Migration adds:
- `events.organiser_club_id uuid references clubs(id) on delete set null`
- Partial index `on events(organiser_club_id) where organiser_club_id is not null`
- No new grants needed (existing `events` grants cover it).

## Part 2 — Fuzzy match backfill (one-off, server function)

New server fn `backfillEventOrganiserFromClubs` in `src/lib/admin-events.functions.ts`, called from the admin sync-runs page or a one-off `/api/public/admin/backfill-event-organiser` route with `x-admin-secret`.

Match logic (deterministic, no LLM):
1. Load all ACTIVE clubs (~1,417) once: id, name, town, county, region.
2. Precompute a normalised name key for each club: lowercase, strip punctuation, expand `&`→`and`, drop trailing tokens `ac|rc|rrc|rc/tc|running club|athletic club|harriers|striders|runners|tc|tri`.
3. For each ACTIVE EA event where `organiser_club_id is null` and source in ('england-athletics','scottish-athletics','welsh-athletics','ni-athletics','runabc'):
   - Build candidate strings from `name` (split on ` - `, `:`, ` – `) plus any parenthesised suffix like `(Hosted by X)`.
   - Normalise each candidate the same way.
   - Look for an exact key match first; if none, token-set match with ≥0.85 Jaccard on the club-name tokens.
   - **Tie-breaker / safety:** require the matched club's `county` or `region` to equal the event's — otherwise reject (avoids e.g. matching "Harriers" from wrong county).
4. On match, write both `organiser` (canonical club name) and `organiser_club_id`.
5. Report counts: scanned, matched, ambiguous-skipped, no-match.

Expected hit rate: 20–40% of the 4,900 EA events. This is a deliberately conservative match — better to miss than to falsely attribute.

## Part 3 — UI wire-up

`src/routes/events.$slug.tsx`, "Organised by" line:
- If `event.organiser_club_id` and the matched club is joined in, render `Organised by <Link to="/running-clubs/$slug">{club.name}</Link>`.
- Else fall back to plain text `Organised by {event.organiser}` (unchanged).

`src/lib/events.functions.ts` `getEventPageData`:
- When `event.organiser_club_id` is set, fetch that club row (id, slug, name, town, county) and attach as `organiserClub` on the page data.
- "Other races by organiser" query: prefer `where organiser_club_id = event.organiser_club_id` when set; fall back to today's `ilike organiser` when not.

## Part 4 — Verification

- Run backfill in dev, spot-check 20 matches manually (top matches + a few borderline).
- Re-run the top-pages audit; expect "Organised by" render rate to jump from 0/20 toward whatever share of the sample got a match (probably 4–8/20).
- Log matched counts to `sync_runs` under a new source `backfill-organiser-match`.

## Out of scope

- LLM/fuzzy over the runabc / TRA rows (revisit once EA numbers are known).
- Auto-re-matching on every sync — kept as a manual admin action for now; can be added to the EA sync's tail once we trust the match quality.
- Any change to the "Same weekend nearby" block (already shipped in the previous PR).

## Technical notes

- FK uses `on delete set null` so club deletions don't nuke event rows.
- Backfill is idempotent: guard on `organiser_club_id is null` so re-runs only fill new gaps.
- All matching happens in JS server-side; no pg_trgm dependency.
- No changes to sync files themselves in this PR — match runs against already-imported rows.
