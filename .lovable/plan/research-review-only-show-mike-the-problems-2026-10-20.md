# Research review: only show Mike the problems

## The change
You're right. Checking every fact by hand repeats the research. The new rule:

- **Accepted automatically:** facts marked "verified" that come with a real quote from the organiser's own website, whose race date matches the edition we hold, and that have no conflicts. You never see these one at a time.
- **Sent to you:** only facts that are flagged. That means: different from an earlier pass, contradicting another fact in the same file, from a site that isn't the organiser's, for a different year's race, or marked "needs review".
- **Never auto-accepted, whatever the source:** entries open or closed (these change too quickly), and course maps (we need permission to reuse them).

## What the research page becomes
1. A short summary at the top, for example "3,850 facts accepted automatically · 79 need you".
2. A "Needs you" list. Each row says in plain words what's wrong, e.g. "Start time: 09:00 in September, 09:30 now", and has one button for each answer: **Use new**, **Keep old** or **Ignore**. You never type anything.
3. Accepted facts stay available to look through by race, but you don't have to do anything with them.
4. The September crawler notices and developer tools go into a collapsed "Technical" section.

## Safety
- Every automatic acceptance keeps a record of the rule that accepted it, so a bad batch can be undone in one go.
- Accepted facts still don't appear on race pages yet. Showing them, e.g. "Flat · chip timed · dogs welcome", is a separate step you'll approve.
- The race listings themselves are not changed. I'll check this before and after.

## Technical details
- New rule-based auto-review: it writes an audit row with reviewer `auto:rule-v1` and the rule ID into the existing append-only review table. Eligibility: confidence=verified, evidence quote present, source host passes classifyEventLink as organiser-owned, the edition date matches events.date_from, no quarantine or cross-batch flag, and the field is not entries_status or course_map_url.
- Run it once on the three existing batches, then automatically on each future import.
- Bulk undo: an append-only "revoked" review for every row from a given rule version.
- Tests for each eligibility rule, plus one test showing that a flagged fact is never auto-accepted.
- Rework the admin component to put the "Needs you" queue first, with one-click buttons.
