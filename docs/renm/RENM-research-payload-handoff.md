# Structured research handoff — 19 October 2026

This is the transport contract for new page research. It connects the existing producer and review table; it does not approve public race changes or restart collection. The executable field list is `services/race-monitor/event-fields.json`; the web validators are `research-event-facts.ts` and `researchIntakeEnvelope` in `source-research.ts`.

## Producer instructions

Produce one observation per actual source capture, using the registered source UUID and a batch/run UUID. Preserve the real capture timestamp, source/final URL and SHA-256 of the exact captured content. Do not manufacture metadata from an exported CSV or relabel old research as a new fetch. Generate an observation UUID once; keep the exported bytes and UUID unchanged on retries.

Use `proposal: {kind: "page_change", extraction: {...}}`. Extraction has version 1, `facts`, `missing_fields`, and `issues`. Keep `evidence.summary` to one or two plain-text sentences, at most 400 characters. Describe observed candidates honestly; a first baseline or extractor reassessment is not proof that the organiser changed a fact. No page bodies, HTML, navigation text, descriptions or long paragraphs.

Each fact has exactly `field`, `value`, `quote` and `locator`. Text evidence must be a verbatim short source passage (whitespace may be normalised); no invented quotes, ellipsis substituted for an unvisited URL, guessed CSS selectors or inferred dates. For structured data use the actual structured-data path and source value; a rendered-page quote and a structured key/value representation are different evidence methods. A schema validator cannot prove factual accuracy or quote fidelity: the researcher and supervising review must check the original source and exact edition. The deterministic extractor currently uses structured key/value representations for JSON-LD fields; never describe those as verbatim rendered text.

The approved fields and their types are:

| Fields | Value contract |
| --- | --- |
| `name`, `organiser` | nonblank string, maximum 300 characters |
| `date_from`, `date_to` | real ISO calendar date `YYYY-MM-DD` |
| `date_raw`, `town`, `county`, `entry_fee` | nonblank string, maximum 200 characters |
| `distances`, `location_raw` | nonblank string, maximum 500 characters |
| `discipline`, `country` | nonblank string, maximum 100 characters |
| `organiser_url`, `entry_url` | full credential-free HTTP(S) URL, maximum 1,000 characters |
| `licensed` | nonblank string, maximum 50 characters |
| `lat`, `lng` | finite numeric pair, latitude ±90 and longitude ±180; both need evidence |
| `is_recurring` | boolean; true means weekly recurrence, which must remain undated |

There are 18 fields, including country and coordinates. Annual races are separate dated editions, not weekly recurrence. A yearless date stays unknown. `entry_url` is a candidate destination, not proof that entry is open. Dates/quotes/edition and entry destination must agree; never reuse a previous edition's booking link without checking it.

Maximum 32 facts; each quote 1–240 characters and locator 1–160. Combined quotes maximum 4,000 characters. Multiple distinct values may remain as candidates; retain ambiguity in `issues` and copy every issue to observation `conflicts`. No duplicate field/value pairs. `missing_fields` must contain every absent approved field exactly once; missing never means clear an existing value. With zero supported facts, send an empty facts array, all 18 missing fields and an explicit issue. Do not send a bare `{"kind":"page_change"}`.

Start time, surface, accessibility, parking, cutoff, entry availability and course-map enrichment do not currently have mappings in this contract. Keep these facts and their original evidence in the research artifact until their storage/review mapping is agreed. Do not invent keys, discard evidence silently or place it in the summary.

## Offline export and validation

The checked example is [research-payload-example.json](../../services/race-monitor/research-payload-example.json). It uses synthetic `.example` sites, synthetic identities and a fixed capture; it is a test fixture, never production data. The Tiptree example previously circulated in chat is not verified race evidence and must not be submitted.

From the repository root:

```sh
python3 services/race-monitor/research_payload.py validate /private/research-envelope.json
```

This checks an existing file against the producer contract, prints a result, and makes no network request or database change. A refusal identifies the contract problem; repair it from existing evidence rather than guessing.

To wrap a completed extraction and original evidence metadata into a new handoff:

```sh
python3 services/race-monitor/research_payload.py build \
  --extraction /private/extraction.json \
  --evidence /private/evidence.json \
  --source-id REGISTERED_SOURCE_UUID \
  --run-id BATCH_UUID \
  --output /private/research-envelope.json
```

Replace the uppercase placeholders with the known UUIDs. This creates one new observation locally after validation. It refuses to overwrite a prior export, so retries retain their original identity and bytes. It does not convert arbitrary CSV columns, fetch evidence, sign or submit anything. Run it once per source capture, not once for many races from different sources.

Signed delivery still uses the existing HMAC headers, five-minute timestamp window, 50-observation / 512,000-byte envelope limit, source registration and immutable-ID SQL gates. Admin import uses the same strict page-research validator. New or conflicting editions remain review-only. Valid formatting does not grant Apply authority or imply a match to an existing race; the review table requires explicit occurrence selection.

## Historical evidence and activation

Keep historic observations, source controls, completed pilot policy and review history intact. The 43 pending records inspected on 19 October include ten structured extractions and manual review evidence; they are not a disposable raw-crawler batch. Do not rewrite them in place or replay cleanup/relationship receipts. Any later re-extraction needs its own provenance and explicit relationship to the original capture.

The six-source pilot ended 13 October and its completion guard is retained. Stage/build/test repairs without calling its worker or ingesting fixtures. A new collection window, allowlist, backlog policy and supervised first-batch acceptance must be established before reactivation. Intake remains review-only; this package does not implement autonomous public publication.
