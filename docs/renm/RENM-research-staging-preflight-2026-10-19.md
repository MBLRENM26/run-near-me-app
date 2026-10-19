# Research staging preflight — 19 October 2026

## Scope and correction to earlier advice

Mike authorised beginning the previously proposed cleanup and research staging. No public data projection, schema change or deployment was performed in this package.

Observed evidence from managed database reads: the 43 pending research observations were not 43 raw September monitor dumps. There were six untouched September notices, ten structured extractions and 27 later evidence-only notices carrying prior review context. Blanket dismissal would have hidden useful evidence and Codex work.

The six untouched notices were rejected through `review_source_research` with batch note prefix `RENM-PILOT-CLEANUP-2026-10-19:`. All six rejected statuses and all six audit records were read back. Original evidence remains stored. Rejection has no supported reopen transition; any renewed finding needs fresh intake, not deletion or fabricated reversal.

Observation IDs: `06cd5ccb-92da-4726-bd0a-ff2378395476`, `5958fbfa-07d9-432d-9de5-c11a0a65ad5a`, `97f15434-69e4-4d2a-8118-5c60f93dca54`, `bbe30eb2-a284-45fe-921c-4350cc802801`, `c661ddb0-e3ed-45f1-a1fe-e0142e8dae66`, `e9ce1c89-790b-49d9-b9dd-9e42589b0ca1`.

The canonical complete events fingerprint was identical before and after: `83092929778e0163c22e60e4d379584d`. Pending queue after cleanup: 37, including ten structured extractions.

## Uploaded evidence assessment

File inspection: 904 race rows, 212 fact evidence rows across 39 slugs. Agent confidence labels are reported claims, not independent source verification. Blank values remain unknown. Rate compliance and course reproduction permissions are not established.

None of the rich fact attributes maps directly to the current `researchEventFields` allowlist. Do not substitute course maps for entry URLs, surface for discipline, or entry status for lifecycle status. Licence assertions include pending and TBC cases; `yes` must not be interpreted as licence approval.

The supplied files lack the captured-page hash/final URL envelope required by current research intake. Do not invent those values or hash a CSV and label it a captured webpage. Keeping every fact in an evidence-summary string would repeat the rejected text-dump approach. A separately approved typed storage and review package is necessary.

The earlier ZIP contains 73 proposed club matches referencing 57 club slugs. All are `plausible_needs_review`, and their match evidence cites the input club catalogue rather than independently demonstrating organiser identity. They must not be automatically accepted or advertised as verified host connections.

Existing database work already includes 41 applied club_relationship observations; 31 distinct future ACTIVE events match their projected club IDs and occurrence dates at this read. These counts are inventory observations, not proof of current discovery eligibility. Month links must also satisfy accepted verified organising relationships and unique approved club crosswalks, as the existing club-profile reader requires.

## Next gates

1. Add read-only month host-club links using existing accepted relationships and public-safe club fields; test identity ambiguity and current discovery eligibility. No blanket enrichment import.
2. Separately approve typed rich-fact storage, edition matching, evidence preservation, review/reversal and public projection; stage before publication.
3. Publish month layout and IndexNow only on explicit deployment approval. Reminder sending remains off; Codex owns monitor payload repair.

The earlier mandated package upgrade failed and was reverted in this conversation; it was not retried, per the dependency-update exception.