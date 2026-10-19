# Monthly club links, then safe race-fact staging

## Completed preflight

- Archived six untouched September monitor tests with retained evidence and audit records; preserved the other 37 pending findings.
- Checked the uploaded research. The 73 club matches are candidates, not verified host relationships. Existing reviewed work already includes 41 applied club relationships.
- The 212 new race facts do not fit the current intake fields. They have not been forced into text dumps or published.

## Package 1 — Clubs hosting races this month

Add a compact section to existing monthly lists, linking club names to their RENM club pages and showing the number of eligible listed races they host.

- Use existing accepted, verified organising relationships and uniquely approved club identities only.
- Respect the list's month, distance and active region/weekend filters.
- Omit the section when no verified club-hosted races qualify.
- No name matching, new identities, bulk import, contact details or public provenance.
- Keep existing month totals unchanged and reuse the shared month-summary foundation.

### Technical details and acceptance

Extend the month data with a narrow read-only public projection, following the identity and organising checks in the existing club-races reader. Never return raw ORL rows or evidence to the browser.

Tests: accepted relationship included; proposed/rejected relationship excluded; ambiguous club crosswalk excluded; mismatched event club excluded; dates/distance/filters respected; distinct races counted once. Check a populated month end-to-end and at desktop/mobile sizes.

Rollback: remove this read-only section and its query; no database mutation is needed. Keep deployment separately approved.

## Package 2 — Rich race facts, separate approval

After Package 1, propose a small typed fact-and-evidence store covering the supplied attributes, not changes to unrelated event columns.

Preserve original slug/edition, quoted evidence, checked time and agent confidence separately from reviewer acceptance. Resolve existing event identity and dates, flag contradictions and retain unknowns. Do not invent captured-page hashes or reproduce course maps without permission.

Stage the 39 researched races for review first. Public display, freshness rules, reversible acceptance and import-conflict behaviour require their own tested approval package before anything appears on race pages.

## Not included

No automated outreach, reminder activation, monitor changes, new SEO page types, bulk club acceptance or publishing in this package.