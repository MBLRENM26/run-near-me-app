# Organiser identity cleanup — scope plan (TBC/unknown cohort)

## Why this matters

The organiser reach table on /admin/revenue — the account list for any paid
organiser offer — only works when an event has a named organiser. Today only
141 of 1,181 future ACTIVE events (12%) have one. Everything else groups as
"TBC" (108, ranked 2nd), a bare domain, or is skipped entirely.

## Verified current state (production, read-only, 18 Sep 2026)

| Cohort | Events | What we hold | Resolution route |
|---|---|---|---|
| Named organiser | 141 | organiser text (SA 78, manual/submissions 167 incl. past) | already fine |
| organiser = NULL, EA source | 575 | organiser_url on 566 (real organiser sites: RunThrough 89, Nice Work 38, ATW 11, club sites…); organiser name absent | domain → organiser |
| organiser = NULL, runabc source | 222 | organiser_url mostly entry platforms (Eventrac 49, EntryCentral 12) — not organiser-owned | needs source evidence (out of scope) |
| organiser = NULL, TRA source | 119 | organiser_url = races.tra-uk.org listing (untrusted host) | needs source evidence (out of scope) |
| organiser = 'TBC' | 108 | one-off batch imported 8 May 2026. Zero provenance: no source, source_url or organiser_url. 33 have entry links (21 scottishhillrunners.uk, 8 letsdothis, 4 eventrac). One row even has town 'TBC' | manual triage per event |
| organiser = 'Unknown' | 10 | as above | same triage |
| organiser = NULL, Welsh/NI | 14 | no organiser_url | needs source evidence (out of scope) |

Supporting facts: the clubs table has 1,356 active clubs with websites
(1,073 distinct hosts, none on multi-tenant platforms); 168 EA future events
already match a club website domain exactly. The ORL `organisations` table is
empty (8 placeholder rows) so domain→organisation has nothing to match yet —
we will not populate it in this package.

## What we build (this package — code + read-only admin, no data writes)

1. **`src/lib/organiser-resolution.ts`** — pure, deterministic, no network:
   given an event, propose `{ organiser, organiser_type }` from evidence only:
   - Club-domain match: organiser_url host == club website_url host
     (www-normalised). Sets organiser_type 'club'.
   - Reviewed commercial map: a constant object of organiser_url host →
     `{ name, type: 'commercial' }` for recurring EA hosts (RunThrough,
     Nice Work, ATW, RunNation, Evensplits, Run For All, …), each entry
     annotated with the matched event count so the map is reviewable.
   - Everything else (entry platforms, races.tra-uk.org, no URL) → no
     proposal. Unknown beats false precision.
   - Unit tests: host normalisation, club vs commercial precedence, no-match
     cases, the TBC/Unknown literals treated as unnamed.

2. **Admin worklist page** (`_adminShell.admin.organisers.tsx`, "Organisers"
   nav link): cohort summary counts, a proposed-match queue (event, current
   value, proposal, basis, search clicks + reminder requests so high-value
   rows sort first), and the TBC triage queue (33 with entry links and any
   with demand signals first). Read-only: accepting a proposal stages it into
   a review list; nothing is written.

3. **Application step (separately approved, after review)**: apply staged
   proposals through the audited edit route (event_edits rows with notes),
   plus re-run the existing name-based club backfill. Then re-check
   /admin/revenue organiser reach before/after.

4. **TBC cohort triage (manual, ~118 rows)**: per event — find the official
   site; if found, audited edit fills organiser / organiser_type /
   organiser_url; if unverifiable, demote (EXPIRED/HIDDEN) through the same
   audited route, never delete. Mike does the judgement calls; the worklist
   page makes it fast.

## Success measure

Named-organiser share of future inventory: 141/1,181 (12%) → ~70%+ after the
EA cohort resolution and TBC triage. The revenue page's organiser reach
becomes an honest account list for the manual organiser sales test.

## Out of scope

- Scraping runabc / TRA / Welsh / NI pages for organiser names (needs the
  QL2 source-evidence step and feed rules).
- Populating the ORL `organisations` graph; organiser portal; any new schema.
- Discovery gates, event pages, links, analytics, provenance, sitemaps.

## Boundaries

No schema/migration writes; no deploy without explicit approval; every data
write goes through event_edits with a note under separate approval; organiser
never asserted without deterministic evidence; clicks remain hand-offs, never
entries or organiser value.

## Technical notes

- Club-domain matching uses exact host equality after lowercasing and
  stripping `www.`; subdomain hosts (e.g. `zigzagrunning.eventrac.co.uk`)
  are entry-platform and never proposed.
- The commercial map lives in one reviewable constant, same pattern as
  REVENUE_THRESHOLDS.
- Worklist queries reuse the admin-gated read-only function pattern from
  admin-recurrence.functions.ts (paging past the 1,000-row cap).
- Filling organiser text will change how /admin/revenue groups organisers —
  that is the intended outcome; no public page changes (OrganiserLine already
  renders whatever is stored).
