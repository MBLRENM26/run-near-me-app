# Stage the second research pass (670 races) privately

Load the new pass (670 races, 3,740 evidence points) into the existing private review area. Nothing gets published, and no race pages change.

## What happens

1. Check both new files together using the same rules as the first 39-race import. Every fact needs a source, a check time and a quote. Blank means unknown, never "no". Pending or TBC licences stay marked as uncertain.
2. Match each race to the right occurrence. Flag wrong editions, date mismatches and slugs we can't find instead of forcing a match. Glamis is withheld, as the agent advised.
3. Treat this pass as a newer batch. The earlier 39-race facts stay in place, and nothing is overwritten. Where a fact repeats, it is recorded once. Where the two passes disagree, both are kept and flagged for review.
4. Quarantine facts we can't trust: values that differ between the two files, unclear yes/no answers, or a race with more than one competing answer. Show feet-to-metres conversions as converted. Note the unconfirmed request-pacing in the first batch as a limitation on the import.
5. Make the review screen workable at this size. Add filters for upcoming races only, flagged facts and field type. Group facts by race, and show counts instead of one long list.
6. Afterwards, list the in-window races still missing facts for fixable reasons, such as pages that didn't load. These are the candidates for a targeted next agent pass.

## Technical details

- Reuse `validateRichResearch` and the private batch, assertion and audit tables. A new batch row stores the file hashes, so importing the same file twice does nothing.
- Validate that the evidence file's headers match what the code expects before importing. The first quick check failed on a missing `slug` header, which suggests a BOM or a renamed column. If columns were renamed, add explicit header mapping. Never guess.
- Add filtering and pagination on the server to `listRichRaceResearch`, because 3,740 rows is too many to send in one go.
- Tests: re-importing the same files does nothing, earlier assertions are never altered, cross-batch conflicts are flagged, and blank is never treated as false.
- Verify by signing in as admin, opening the review screen, and confirming the counts match the README: 670 races and 3,740 evidence rows, minus quarantined items, with the reasons listed.
- Event rows stay unchanged; their fingerprint is checked before and after.

## Not included

Showing facts publicly, entries-open buttons, course-map embeds and publishing. Each of these still needs its own approval.
