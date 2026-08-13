# Apply Cardiff / Altrincham course-mismatch correction

## What this does

Applies the merged migration `20260813173000_remove_cardiff_altrincham_course_mismatch.sql` exactly as committed on main (e90a12d). The earlier `updated_at = now()` line that caused the previous failure is no longer present in the file, so it should now apply cleanly.

Two narrowly scoped data corrections:

- Clears the Cardiff 10K 2026 record's organiser link, which currently points at an unrelated Altrincham event. Its official Welsh Athletics entry link is untouched.
- Marks the matching unresolved "event name mismatch" review item as resolved.

## Current state (verified read-only)

- `cardiff-10k-2026` (source `welsh-athletics`) organiser link = `https://www.runthrough.co.uk/event/altrincham-10k-2026`
- Review `21ea32e2-44c7-45a6-81f9-9db7847c7e89` (`event_name_mismatch`, Altrincham URL) is unresolved
- A second unrelated mismatch review (Regents Park URL) exists and is **not** touched by this migration

## Steps

1. Apply the migration SQL byte-for-byte via the migration tool (no rewriting, no added statements).
2. Verify Cardiff's organiser link is NULL and the Welsh Athletics entry link is unchanged.
3. Verify review `21ea32e2…` now has a resolved timestamp, and the Regents Park review remains unresolved.
4. Report migration result and verification only. No code changes, no schema changes, no deployment.

## Stop conditions

- Any error during apply: report the failure and leave state unchanged.
- Any row count other than 1 affected per statement: report rather than adjust the SQL.
