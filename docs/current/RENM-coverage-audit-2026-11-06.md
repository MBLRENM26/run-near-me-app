# Catalogue coverage audit — 6 November 2026

## Scope and permission

Mike approved Kent-first evidence gathering, nationwide missing-location checks and design of ongoing checks. This package is read-only: no events, research rows, schedules, source allowlists, permissions, public pages or dependencies changed. Old Kent/South London research remains candidate evidence, not an import source. Corrections and monitoring expansion require a separate implementation package.

## Summary

**Observed evidence:** four directly dated Kent 2027 race meetings were not found by targeted name and URL searches of all event states: Dartford, ellenor, Kent Spring and Run Kent Tonbridge. Eight future active non-duplicate rows lack coordinates nationally; one is a likely duplicate rather than an additional race needing a pin. Two Kent duplicate clusters and a county error require reconciliation. Scotland's latest scheduled import failed, while England's completed.

This is a bounded audit, not proof of complete regional or national coverage.

## Method and limits

- Private SELECT-only database reads on 6 November 2026, with a fixed audit date. Exact reusable queries: `RENM-coverage-audit-2026-11-06.sql` alongside this report.
- Seven official organiser/club sources researched; 15 upcoming meeting leads checked against catalogue names, editions and URLs. Dedicated pages for the four absent editions, Canterbury, Turkey Run, Bedgebury and Chatham Christmas Dash were independently fetched successfully.
- Official pages are live observations, not archived proof of announcement dates. Publication dates remain unknown.
- County-labelled inventory misses wrongly classified/null-county records. Similar names alone do not justify a merge or establish absence under an unrelated title.
- ACTIVE and no duplicate pointer mean stored operational candidates, not proven G3/G4 eligibility. Link trust and public projection still gate discovery.
- No personal contacts, raw HTML, private identity evidence or subscriber data collected.

## Nationwide baseline — observed evidence

| Selection | Rows | Interpretation |
|---|---:|---|
| ACTIVE, no duplicate pointer | 5,833 | Includes past and undated records; not a discovery headline |
| Above, sort_date on/after 6 Nov | 751 | Stored future rows, not unique verified races |
| Future rows lacking either coordinate | 8 | All missing both; no partial pairs |
| Future rows with estimated date flag | 0 | Stored flag only; not independent date verification |
| Future rows outside existing discovery rectangle | 3 | Jersey/Guernsey; legitimate islands, not automatically bad pins |
| Future zero-component or known legacy fallback points | 0 | Does not establish venue accuracy |
| ACTIVE canonical rows with null sort_date | 1,384 | 1,383 recurring; only one nonrecurring |
| Undated recurring rows lacking coordinates | 0 | Recurrence is not an invented next occurrence |

The approved public projection contains the same 751 future rows and eight missing pairs. One future stored race is explicitly country=Jersey and thus excluded by the country gate; its mainland-looking point needs private geography review, not automatic country reassignment.

### Missing-coordinate candidates

| Race / slug | Stored date | Action before correction |
|---|---|---|
| Ayrshire Cross-Country Championships — `ayrshire-cross-country-championships` | 14 Nov 2026 | Confirm venue and participation rules; town=Irvine does not identify start line |
| St Andrew's Day Run — `st-andrews-day-run` | 30 Nov 2026 | Organiser page request failed; retry/manual evidence required |
| Blast 5K Series, The Meadows — `blast-5k-series-the-meadows-2026-2026-12-22` | 22 Dec 2026 | Official page confirms date and East Meadows Play Park, Melville Drive, Edinburgh; pin still needs sourced geocoding |
| Community Canal Run — `community-canal-run-tiverton-2026` | 28 Dec 2026 | Town=Bridgwater, county=Somerset, slug says Tiverton; official page 403, entry URL contains 2023. Reconcile identity/date/venue before pinning |
| Canterbury 10 Mile — `canterbury-10-mile-road-race-2027-01-24` | 24 Jan 2027 | Likely duplicate of pinned `canterbury-10-mile-road-race`; reconcile rather than create another pin |
| DonFaster 5K — `donfaster-5k-april-2027` | 2 Apr 2027 | HTTP 200 but no readable edition/venue evidence in fetched page; needs rendered/manual check |
| DonFaster 5K — `donfaster-5k-july-2027` | 2 Jul 2027 | Verify edition and venue; do not copy coordinates merely because series name matches |
| DonFaster 5K — `donfaster-5k-october-2027` | 1 Oct 2027 | Verify edition and venue |

Other geography exceptions: Jersey Half Marathon, JCCSurvivors Half Marathon and Sure Guernsey Marathon fall outside the existing 49.9–60.9 / −8.6–1.8 discovery rectangle. No scope approved to widen it. `race-for-the-wild-13k-2027-06-27` has country=Jersey but point 55.378051, −3.435973; official fetch returned 403. Keep excluded pending correction evidence.

## Kent reconciliation list

27 ACTIVE future non-duplicate county=Kent/Medway rows are stored; all have an organiser URL string. This is not 27 unique discoverable events: duplicates and URL trust still matter. The county inventory includes legacy classifications of Beckenham/Bromley; boundaries are not inferred from names.

### Four missing 2027 edition candidates — sourced facts

Targeted all-state name/URL reads found no matching future occurrence. Stage these independently, verify stable identity and venue coordinates, then approve additions. Do not overwrite old 2026 occurrences.

| Official meeting | Date | Venue/locality | Evidence and official URL |
|---|---|---|---|
| Dartford Half Marathon, 10k & Junior Race February 2027 | 21 Feb 2027 | Central Park, Dartford | “Date Sunday, 21 February 2027”; RunThrough explicitly describes working with Dartford Harriers AC. https://www.runthrough.co.uk/event/dartford-half-marathon-february-2027 |
| ellenor Half Marathon & 10k | 14 Mar 2027 | Cyclopark, Gravesend, DA11 7NP | “Next Race: 14/03/2027”; “A BRAND NEW EVENT FOR 2027!” https://www.sportingeventsuk.com/e/ellenor-half-marathon-and-10k-16033 |
| Kent Spring Marathon & Half Marathon | 18 Apr 2027 | Woodchurch Green, Ashford, TN26 3PE | “Next Race: 18/04/2027”; “relocated to Woodchurch for 2027”. Do not reuse an old Sandyacres venue/course. https://www.nice-work.org.uk/e/kent-spring-marathon-and-half-marathon-9124 |
| Run Kent Tonbridge Half Marathon, 10k & 5k | 3 Oct 2027 | Judd School, Tonbridge | “Date Sunday, 3 October 2027”. Old 2026 ACTIVE/HIDDEN/DUPLICATE records exist but do not represent this edition. https://www.runthrough.co.uk/event/run-kent-october-2027 |

### Existing records needing bounded correction

1. **Canterbury 10 Mile duplicate:** both `canterbury-10-mile-road-race` and `canterbury-10-mile-road-race-2027-01-24` are ACTIVE, dated 24 Jan 2027 and publicly return 200. Official https://canterbury10.co.uk redirects to https://www.canterbury10.co.uk/e/canterbury-10-mile-road-race-8571 and states that date, University of Kent Sports Centre, CT2 7NL. Keep one reviewed canonical occurrence; preserve alias/history and reconcile facts/locks before marking duplicate. The newer-suffixed row lacks region and coordinates.
2. **Turkey Run duplicate/venue:** `maidstone-harriers-33rd-turkey-run-2026` and `turkey-run-west-malling-2026` are ACTIVE with the same date and official URL, but different pins. Official page states 6 Dec 2026, East Malling Research Station, New Road, East Malling, ME20 6AP. Review and consolidate; do not choose a pin merely because it already exists. https://maidstoneharriers.co.uk/events-community/the-turkey-run/
3. **Bedgebury geography:** `bedgebury-forest-10-and-5-mile` stores East Sussex/Cranbrook. Official page explicitly gives Bedgebury National Pinetum & Forest, Bedgebury Road, Goudhurst, Kent, TN17 2SJ, 7 Feb 2027. Proposed county/town correction; validate start point separately. https://www.nice-work.org.uk/e/bedgebury-forest-10-and-5-mile-9014
4. **Chatham Christmas Dash destination:** stored `chatham-maritime-christmas-dash` points only to the organiser homepage. Dedicated official page states 13 Dec 2026, The Bandstand, Chatham Maritime, ME4 4QZ: https://www.sportingeventsuk.com/e/chatham-maritime-christmas-dash-7499 . Propose event-specific official-information destination; this alone does not establish verified entry-open status.

Pacific Ashford's apparent second listing is already DUPLICATE; do not reopen completed cleanup. Its official page confirms 29 Nov 2026. Run Happy Run Healthy's Swanley and New Ash Green dates match stored future rows; Ebbsfleet 1 Nov is past now, not a missing future occurrence.

### Holds and false positives

- Allhallows KFL: club fixture table gives 31 Jan 2027 at Haven Allhallows Holiday Park; league says provisional, and unrestricted entry is not established. No separately branded event title established. Hold as league evidence, not a new public entry page. http://www.isteadandifield.org.uk/cross-country/ and https://kfl.canterburyharriers.org/ . HTTPS club request failed certificate verification; do not bypass it.
- Harvel official page still advertises 2026; no 2027 date established. Do not roll forward annually: https://harvelhashhouseharriers.com/harvel-5/ .
- Same town names are not identity evidence: Cranbrook Christmas Cracker in Devon is not a Kent geography error just because another Cranbrook exists.
- Four past-start/future-end rows surfaced: November Nightmare and Ealing/Serpentine/First Saturday series. Date ranges may represent multiple editions rather than a continuous event. Do not change upcoming logic or fabricate next dates without reconciliation.

## Import and monitoring health — observed evidence

- England Athletics: 2 Nov's three chunks succeeded: 480 fetched, 325 written, 24 new and 301 updated. These are logged operations, not unique net catalogue growth. Post-run reviewed-field violations=0 in each chunk; 81/50/31 added conflict attempts require review and are not silently accepted source changes.
- Scottish Athletics: active Monday 05:30 UTC job; latest run 2 Nov failed with “Illegal invocation: function called with incorrect `this` reference”. Last success 26 Oct manual run: 82 fetched, 60 written, seven new. Source inspection finds an unbound `globalThis.fetch` used as a dependency method in `scottish-request-retry.ts`; this is a plausible cause, not a reproduced diagnosis. Repair/test/publish is separate work. Do not rerun a writing importer merely to test it.
- Reminder job 6 remains inactive; no subscriber messaging was performed.
- 1,062 research source rows, 169 enabled flags, intervals 24–168 hours. Enabled flags do not prove a running worker or authorise fetching every row.
- Existing homelab collector is expired/disabled under the 5 Nov operations contract. Only a separately gated one-source, seven-day Great Bentley renewal is specified, not nationwide coverage monitoring.
- `cron_health_24h()` read was denied by the current read role. Do not weaken its grant. Low-level retained HTTP/cron-response health remains unverified; schedule and sync receipts were readable.

## Actual nearby results verified

Greenhithe 51.456, 0.284, 10-mile radius, dated mode: **seven Explorer matches**, including Peninsula 13.1 (31 Jan 2027), Swanley, New Ash Green, ATW Neon Run, North Downs Run, Chislehurst and Pitsea.

Preview browser rendered all seven without page errors; screenshot inspected. Published Explorer HTML independently returns 200 with seven matches and Peninsula; published Peninsula date page returns 200. This is a fixed Greenhithe query, not proof of Mike's phone GPS position or all nearby races being covered.

## Proposed ongoing checks — design only

Two distinct jobs are needed: **catalogue integrity** finds bad/incomplete stored records; **calendar reconciliation** discovers occurrences not yet stored. Known race-page monitoring cannot do both.

1. Daily read-only receipt check against actual EA/SA weekly schedules: missing/overdue run, error, partial yield, review-integrity violation and conflict pressure. A successful HTTP response alone is insufficient. Reuse sync receipts; add no competing importer.
2. Weekly national exceptions snapshot: missing/partial/fallback/out-of-envelope pins, contradictory geography, nonrecurring missing dates, date-range/series ambiguity and potential duplicate clusters. Keep stable IDs, evidence timestamps and delta-only reporting. Never assign town-centre pins automatically.
3. Weekly bounded Kent calendar comparison: initially Run Happy Run Healthy, Nice Work, Sporting Events UK and RunThrough. Check new/changed editions, redirects, dedicated destinations and venue changes against stored identities. Availability failures mean unknown, never cancellation. Explicitly approved fetch allowlist, source permissions, cadence and expiry required before automation.
4. Structured evidence only: short quotes, source URL, checked-at, edition identity, proposed fields and conflict reason. No raw page dumps. Consolidate repeated support; send only genuine uncertainty to review using existing intake rules. No new automatic acceptance policy is authorised here.
5. Proposed trial: four weeks, read-only/private reports, no emails to subscribers/organisers, no automatic public edits/imports. Renew only after reproducibility, duplicate suppression, false-positive rate and workload are assessed. Do not revive the expired collector or silently extend its limits.

### Separate implementation approvals still needed

- Four Kent new editions plus the duplicate/geography/destination corrections, each with source evidence, stable identity, field-lock handling, audit, rollback and public/radius read-back.
- Scottish importer repair with runtime-safe fetch binding, focused regression test and publish acceptance; no automatic rerun against live data.
- Ongoing reporting/calendar allowlist trial, with private access, explicit schedule/expiry, kill switch and no privileged work gated only by a publishable bearer key.

## What did not change

No app routes/UI, schema, live races, source settings, scheduled jobs, emails, reminders or outreach. Existing Bing/IndexNow settings were not altered. No old regional dataset was imported. The previous failed/undone security update is not retried in this audit.