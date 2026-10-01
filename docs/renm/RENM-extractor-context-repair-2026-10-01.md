# Race extraction context repair

The first scheduled database-mapped captures exposed three gaps: Scenic Seven inherited another race's navigation headline and missed its calendar date, Hadleigh's fees lost their distance headings, and Tiptree's name included its promotional date suffix.

`events-mapped-v2` excludes site banners, the observed Divi race-menu/sidebar component and its historical results tables. It retains headers within main/article content. Historical results headlines are excluded from title selection; a document title can supply the race name when there is no suitable heading. Explicit date and licence-label suffixes are removed from name candidates while original heading evidence remains available.

The Stowmarket adapter reads the known calendar's JSON assignment without executing JavaScript. It requires the observed host, script ID and data shape, and an exact normalized race-title match. It extracts only explicit year-bearing dates and locations from matching rows. Multiple matching editions remain separate candidates for review. It does not use article timestamps or unrelated calendar rows.

Hadleigh's subordinate distance headings now accompany fee candidates. Same/higher-level headings end their scope. The observed 10-mile affiliated £25 and unaffiliated £23 prices are preserved as stated, despite their unusual ordering; they require source review before use. No price is automatically selected or applied.

Validation: 43 Python tests and 13 focused TypeScript intake/review tests pass. Minimal reconstructed markup covers the three page structures, irrelevant calendar rows, mixed editions, invalid dates, non-JSON scripts, historical results, and fee-scope resets. Public HTML was inspected transiently during engineering validation; only bounded field candidates, quotes and validation metadata were saved locally. Scenic Seven now yields Scenic 7, 7 mile, 8 November 2026 and the calendar venue. Its two entry destinations remain an explicit ambiguity. Hadleigh retains 22 November 2026 and its five scoped fees; Tiptree retains 11 October 2026 and its entry link.

The existing 18-field database mapping, payload schema, evidence limits, ORL and review gates are unchanged. This worker-only change needs no website republish or database migration. Existing observations stay immutable. The version bump will generate refreshed candidates at each source's next due fetch; classify these as extractor reassessments, not demonstrated source changes, even where the legacy notice summary says “Mapped facts changed”.

Release procedure: build and smoke-test an immutable container without network or production state, then replace the runtime deployment descriptor while holding the launcher's existing lock. Keep the previous descriptor for rollback. Do not start collection, alter due times, expand the allowlist or add a schedule. Scheduled end-to-end delivery remains a subsequent verification step; manual validation does not establish it.
