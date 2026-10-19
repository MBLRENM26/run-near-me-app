# Stage rich race facts safely

Monthly verified club links are complete in preview. This is a separate approval for storing the uploaded research; it does not publish facts or contact anyone.

## What to build

A private, typed research store for the 212 supplied assertions across 39 races. Preserve each original value, quote, source URL, checked time and researcher confidence. Keep reviewer acceptance separate from the agent's claim of verification.

- Match slugs to existing occurrences; compare explicit edition/date evidence and flag unresolved identity or old editions.
- Blanks remain unknown, never false. Licence pending/TBC statements remain uncertain.
- Detect conflicting assertions and duplicate imports without overwriting evidence.
- No public claims, entries-open buttons, pricing, course downloads or embeds are added.
- Do not invent webpage hashes or final URLs absent from these files.

## Technical details

Add private research-batch and fact-assertion tables with explicit service-role grants and RLS blocking public access. Store file hashes labelled as file hashes for idempotency, not captured-page hashes. Each assertion has an optional resolved event ID, field from an explicit rich-fact allowlist, typed candidate value, original raw value, source evidence, match/review state and caveats. Append review actions in a private audit table; corrections create new versions instead of erasing originals.

Keep this separate from mapped event corrections: no changes to events, existing field locks or ORL acceptance. Integrate structured findings into the existing review screen only; do not turn CSVs into evidence-summary text dumps or widen the monitor payload contract Codex is repairing.

## Import and verification

Validate both CSVs together, including field/value agreement, timestamps, quotes, URLs, boolean/number formats and duplicate identities. Quarantine inconsistent assertions rather than silently coercing them. Review-only staging is not publication or independent verification.

Tests cover blank/false distinction, idempotency, mismatched slugs/editions, contradictory facts, pending licences, denied public reads, append-only audit and unchanged event rows. Read staged facts back through the signed-in admin screen before declaring completion.

Rollback removes the new review integration and marks the import withdrawn; underlying evidence and audit remain private. Schema rollback and public projection require separate decisions.

## Later, separately approved

Public display, freshness expiry, acceptance/reversal, protected event projection and course-map permissions. Publishing the current month-list layout, club links and IndexNow remains a separate deployment approval.