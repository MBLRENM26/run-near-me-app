# Approved stale-edition corrections — 24 October 2026

Mike approved the three named issues. No schema or application changes.

## Sourced facts and exact disposition
- Brecons: official Wild Running page states **Next Date: 08/01/2027** at the same Dinas Castle venue. Updated start/sort date to 8 January 2027; end left unknown. Stable organiser/distance reviewed-field occurrence locks rebound in the same transaction with before/after audit. No rich research moved between editions. Existing slug retained. Source: https://www.wildrunning.co.uk/e/brecons-fell-running-trail-and-yoga-camp-11568
- York: official schedule says **monthly from February to November**, ending **Fri 13-Nov 2026**. December 4 remains unsupported. Canonical December record held as HIDDEN, not cancelled, expired or deleted; original date, evidence, locks and duplicate retained. Source: https://evensplits.events/york5k
- Exeter: official page explicitly has **Saturday February 6th** and **Sunday February 7th**, with Sunday Riverside 5 Miles. Earlier suggestion to merge all three was incorrect: Saturday remains separate. Only the identical Sunday pair was consolidated, retaining the established Sunday slug and redirecting the dated duplicate. Source: https://exetercct.org/running-events/exeter-half-marathon/ . Year corroborated by existing EA occurrence IDs; not inferred solely from undated prose.

## Observed acceptance
- Live database readback: three targeted event rows changed, four audit rows added including lock rebind; no deletion.
- All other event rows: identical before/after full-row hash `08ffeaa3fe147beddfa973bca9c15fcb`.
- Browser: camp page displays 8 January 2027; Sunday duplicate resolves to established Sunday page; Saturday page remains accessible; held York December returns 404. No page errors.
- Read-only regression checks: `scripts/stale-edition-acceptance.sql`.
- Shared preview/production database means the data corrections need no publish.

## Rollback
Manual only after checking no subsequent corrections intervened. Lock the three event rows; restore Brecons reviewed occurrence locks to `{date_from:2026-10-30,date_to:2026-10-30,sort_date:2026-10-30}` first, then its original date fields (`date_raw=null`, estimated=false, upcoming=true). Restore York canonical to ACTIVE/upcoming=true without changing its retained date. Restore Exeter dated Sunday duplicate to ACTIVE/duplicate_of=null; leave Saturday and established Sunday unchanged. Use strict reviewed-write mode for lifecycle reversal and append before/after `event_edits` with this package reference; never delete audit rows or evidence. Stop if current values differ from the acceptance manifest.

## Remaining work
Other stale annual editions are unchanged; await authoritative edition announcements rather than manufacture dates. York December requires organiser confirmation before restoration.