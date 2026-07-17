## ORL seed CSV interface — draft plan

Scope: produce two draft CSV files under `organiser-identity-audit/` matching the exact interface the user specified. No parser, no validation, no seed run, no DB write, no schema change, no public-code change.

### Files created

1. `organiser-identity-audit/organiser-identity-review-queue.csv`
2. `organiser-identity-audit/organiser-identity-review-unresolved.csv`

Both files use the exact headers, record types, and taxonomy values listed in the user message. No additional columns, no renamed columns, no extra enum values.

### Content boundaries

- Only the manually researched seed set named in the original ORL brief: Go Beyond Events (two named events) plus the five verified tenant relationships and two `plausible_needs_review` relationships.
- No generic Eventrac population.
- No title-casing of tenant slugs into organisation names.
- No automatic grouping of `gobeyondultra*` subdomains.
- Tenant subdomains recorded on `platform_account` rows only — never as an organisation or auto-generated event link.
- Every `event_link` row cites one exact existing `events.slug`, verified against the live DB before it is written into the queue file.
- Any event named in the brief that does not resolve to exactly one live `events.slug` (missing, ambiguous, multiple candidates) is written to the unresolved file with a `reason` from the allowed list and `candidate_event_slugs` populated where applicable — never guessed into the main queue.
- `evidence_keys` on `platform_account` / `event_link` rows is pipe-separated and only references `evidence_key` values present in the same file.
- Go Beyond tenant-divergence note is carried on the relevant `event_link` row's `proposed_review_note` and as a dedicated `evidence` row of type `manual_observation`.

### Draft-generation steps (read-only)

1. Re-read the ORL brief seed set from earlier in the thread to enumerate: canonical organisation(s), aliases, platform accounts (Eventrac tenants + any organiser-owned pages), evidence URLs, and the two named Go Beyond events plus the seven tenant relationships (5 verified, 2 plausible_needs_review).
2. For each named event, query `public.events` (read-only) to resolve exactly one `slug`. Match on name + known date/location signals from the brief; do not fuzzy-match. Record the resolution outcome per event.
3. Bucket each intended `event_link`:
   - Exact single slug found → row in the main queue with `event_link_confidence` taken from the brief (`verified` or `plausible_needs_review`).
   - Zero / multiple / uncertain matches → row in the unresolved file with the appropriate `reason`.
4. Assemble rows in the fixed order: `organisation` → `alias` → `evidence` → `platform_account` → `event_link`, so evidence keys are defined before they are referenced.
5. Leave every non-applicable column blank for each `record_type` per the interface table.

### Deliverable for review

- The two CSV files.
- A short accompanying note listing: how many rows of each `record_type`, how many events resolved cleanly vs went to unresolved, and the exact SQL used for slug resolution — so you can spot-check before authorising Phase 1 validation.

### Explicitly out of scope

- Writing a seed parser or Phase 1 validator.
- Running validation or any seed function.
- Any DB write, migration, RLS/grant/RPC change.
- Any change to public routes, event data, or link-trust code.
- Any Eventrac-wide expansion beyond the brief's named seed set.
