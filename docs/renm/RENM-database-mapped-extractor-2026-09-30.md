# Database-mapped race extraction

The existing six-source pilot now extracts compact facts into its private research queue. It uses the verified `events` mapping in `RENM-source-field-map-2026-09-30.md`. It does not create a parallel race database, change ORL, or publish source claims automatically. No database migration is required: `page_change` already stores review-only JSON and the live review function refuses to apply that kind.

## Capture contract

`services/race-monitor/event-fields.json` is shared by the Python worker and TypeScript intake validator. It describes 18 direct source fields with the existing admin limits: name, raw/start/end date, weekly recurrence, venue, town/county/country, coordinate pair, distances, discipline, fee, organiser, organiser URL, entry URL and licence. This is a source-fact allowlist, not a replacement for the 41-column database model.

The other columns retain their existing owners. Tags and region are derived by the existing enrichment rules; governance/type/profile require their existing evidence/classification review; estimated dates are an explicit review decision; club identity goes through ORL; source provenance remains in research evidence; generated IDs, routing, timestamps, search, editorial and publication controls are not extracted assertions. Unknown data never becomes a null patch or invented value.

`event_extractor.py` reads Event/SportsEvent JSON-LD, explicit race-date statements, headings, labelled race facts and actual anchor destinations. It distinguishes offer/entry links from results and register-interest links. It does not infer coordinates from prose, infer a year, select a winning edition from conflicting dates, or turn cancellation text into `events.status`. Weekly parkruns retain `date_raw` and `is_recurring` without dated occurrences. Annual races retain explicit dates.

Candidates carry a target column, typed value, supporting excerpt and a structured path or text locator. Multiple dates/entry links and edition conflicts remain visible for review. HTML fallback is deliberately conservative: unlabelled addresses/organisers and dynamically rendered tables can remain missing. `missing_fields` means **not extracted**, not absent from the website. County currently has no generic inference rule; a dedicated evidenced adapter can extend coverage later. No model is in the production path; the prior Qwen benchmark did not justify treating its guesses as facts.

## Retention and review

- At most 2 MB is fetched per response under the existing public-address, robots, redirect and timeout rules. HTML and visible page text exist temporarily in memory and are not saved to `source_captures`.
- Each observation has at most 32 facts, excerpts of at most 240 characters, and at most 4,000 excerpt characters total. Values obey database limits. Up to ten short review warnings may include a further 180-character source fragment each. No general description, image, GPX or page-body output exists.
- Source/final URL, capture time and full-response SHA-256 provide provenance. Facts have a separate versioned fingerprint that excludes block offsets and quotes. Navigation-only changes therefore update fetch accounting without creating another review item. Changes to extracted values, missing fields or warnings create an immutable observation.
- An additive local SQLite `source_extractions` table stores only the latest fact hash per source. The first due fetch after upgrading from metadata-only capture emits an **Initial mapped baseline**. This is not a newly discovered race or one of the original six delivered baseline observations.
- The existing signed endpoint validates every candidate against the shared allowlist. Delivery chooses a byte-bounded prefix below the existing 512 KB limit, preserving IDs and exact payloads across retries.
- The admin research card shows field/value/evidence and missing data. It offers explicit comparison with existing records sharing an exact source, organiser-page or entry-page URL. No match is selected automatically; a shared URL can cover different editions. Lookups are bounded and disclose truncation. Fuzzy club or race-name identity matching is not performed.
- Fact cards have the existing hold/reject actions and no apply action. A reviewer must verify identity/edition and use the existing event editor or prepare a supported audited correction. Existing reviewed-field protection remains in force. Historical observations and the pending baseline closures are untouched.

## Operation and validation

The boot-enabled systemd service/timer remains the only collection scheduler. The six-source allowlist, daily/weekly intervals, remote pause, backlog thresholds and 13 October pilot end are unchanged. Pin the new image only after the web intake/review release is published, using the host launcher lock. Do not reset due times or start a competing worker. The next scheduled activation may be healthy with all sources not due; verify extraction only after actual due-source fetches.

Reports additionally count mapped sources, mapped observations, their UTF-8 payload bytes and retained page captures. Local SQLite and checksum-verified off-host backups include the new hash table automatically. Old images ignore this additive table; rollback does not require deleting audit or review data.

Validation covers field types/limits, invalid and conflicting dates, weekly recurrence, real href capture, structured venue vs organiser address, price/entry qualifiers, hypothetical cancellation policy language, unsupported field rejection, untrusted HTML rendering, UTF-8 delivery batching, restart/replay stability, no whole-page retention and menu-noise suppression. Shared synthetic fixtures must pass both Python extraction and TypeScript intake. Private saved-page evaluations are labelled as Markdown-derived fixtures, not fresh native HTML or live end-to-end collection evidence. Record deployment and the first real scheduled mapped captures in the operations log before claiming live validation.
