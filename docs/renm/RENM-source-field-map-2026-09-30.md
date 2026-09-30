# Source capture mapped to the existing database

Verified 30 September 2026 against the live PostgreSQL schema, generated database types, the admin create/edit validator, England Athletics import mapping, source enrichment, and existing research/ORL review contracts. This is the authoritative target mapping. The database-mapped extractor implements bounded source-fact capture against it; derived, identity, editorial and lifecycle decisions remain in their existing workflows. See `RENM-database-mapped-extractor-2026-09-30.md` for coverage and operational limits.

## Authoritative targets

The live `events` table has 41 columns. Capture targets come from these existing fields, not from a new model-designed race schema. Optional database fields may remain unknown. Missing source evidence must never become an instruction to clear an existing value. Store compact field evidence (source URL, check time, short supporting passage or structured-data path) in the existing private research evidence/review flow. Whole descriptions, navigation and unrelated page copy are not outputs.

| Existing events columns | Capture and mapping rule |
| --- | --- |
| `name` | Race/meeting title from the relevant listing or detail page; admin limit 300 characters. |
| `date_raw` | The source's short date/schedule wording, limit 200 characters. This is also the existing place for weekly recurrence wording. |
| `date_from`, `date_to` | Evidenced start/end dates, normalised to ISO dates. Preserve edition association. Do not use last year's date or invent a new date when the page is inconsistent. Existing import distinguishes a different end date from a single-day event. |
| `is_recurring` | Use the existing recurrence meaning for weekly runs such as parkrun. An annual race with a dated edition is not made undated merely because it happens every year. |
| `date_is_estimated` | Explicit uncertainty control, not permission to guess. Unconfirmed next editions stay held for review. |
| `location_raw` | Short stated venue/address, limit 500 characters. |
| `town`, `county`, `country` | Extract only supported location components; respective admin limits 200, 200 and 100 characters. Avoid assigning the organiser's address as the race venue. |
| `region` | Normalise through the existing UK region rules using verified location. Must be one of the accepted regions. |
| `lat`, `lng` | An evidenced coordinate pair or the existing controlled location-enrichment path. No language-model geocoding guesses. Admin requires both together with valid ranges. |
| `distances`, `discipline` | Stated race options and discipline; limits 500 and 100 characters. Preserve multiple offered distances before normalising tags. |
| `entry_fee` | Short stated price/range and necessary qualifier; limit 200 characters. No inferred price from earlier editions. |
| `organiser`, `organiser_url` | Stated organiser and official information destination; limits 300 and 1,000 characters. Distinguish entry platforms from organisers. |
| `entry_url` | Actual link destination for the relevant edition, limit 1,000 characters; requires link extraction, not just visible prose. Verify destination role before review. |
| `licensed` | Short explicit licence information, limit 50 characters. |
| `governance` | Existing enum, supported by governing-source/licence evidence and existing enrichment rules. Unknown is distinct from unlicensed. |
| `organiser_type`, `race_profile` | Existing enums only, backed by source facts and established classification rules; uncertain cases remain unknown/reviewed. |
| `distance_tags`, `terrain_tags` | Normalise through existing `event-tags` / `source-enrichment` rules, preserving curated values. These are not free-form model labels. |
| `organiser_club_id` | Resolve to an existing club UUID through reviewed organisation/club identity and ORL. Never invent a UUID or link merely because names are similar. |
| `source`, `source_url` | Adapter/source provenance and observed source URL. Preserve original import provenance on edits; new evidence belongs in the audit/research record. |
| `sort_date`, `is_upcoming` | Derived consistently from accepted occurrence/recurrence data using existing application conventions. Not independent website claims. |
| `series_key` | Existing series identity/reconciliation logic. Do not derive a new arbitrary series on each fetch. |
| `id`, `norm_id`, `slug` | Database/source identity and application-generated routing. Reuse matched IDs; use existing source identity and slug collision handling for reviewed creation. |
| `status`, `duplicate_of` | Internal publication/duplicate decisions. The admin contract uses ACTIVE, DUPLICATE and EXPIRED; these are not entry availability or cancellation fields. |
| `is_featured`, `is_curated_tags` | RENM editorial controls, not scraped assertions. |
| `created_at`, `norm_created_at`, `tsv` | Database/import timestamps and search representation; supplied by their existing owners, not source prose. |

The table covers all 41 live columns exactly once. Type/nullability/default evidence is retained in the private workspace `research-pilot/schema-mapping-2026-09-30.json`.

## Club and organiser relationships reuse ORL

- `organisations.canonical_name` and `website_domain` identify an organisation; aliases and platform accounts use the existing identity system.
- `organisation_event_links` connects existing `event_id` and `organisation_id`. Its allowed relationships are `organises`, `entry_platform_hosts`, and `source_suggests`. Evidence/reviews remain in `organisation_event_link_evidence` and `organisation_event_link_reviews`.
- `organisation_club_links` connects an organisation to `clubs.id`, backed by `identity_evidence`. Acceptance requires a reviewer identity and review timestamp.
- The existing `clubs` catalogue is the matching starting point, not a list to recreate. Its factual fields include `name`, `governing_body`, `affiliation_number`, location components/postcode, coordinates, `website_url`, contact fields and `disciplines`. Club-contact enrichment is a separate field-specific task, not a reason to retain arbitrary page content during race discovery. Claim ownership, verification, status, identity, provenance and system timestamps remain controlled by their existing workflows.

## Existing write paths and explicit gaps

The current research `event_change` proposal supports reviewed corrections to `entry_url` and `organiser_url`; `club_relationship` uses existing ORL and identity checks. `new_occurrence` and `page_change` are review-only. A full 41-column extraction mapping does **not** mean the current intake can automatically update those columns. Extend capture/preview coverage with the existing admin/import validation and reviewed-field protection before enabling additional reviewed writes.

The older `source_change_reports` contract recognises `date_from`, `entry_url`, `entries_status` and `event_status`. Entry/cancellation/postponement reports are audit/review information; there are no `events.entries_status` or `events.event_status` columns. Do not map them to `events.status` or add replacement columns without an explicit lifecycle design. The benchmark's generic `date`, `candidate_date`, `schedule`, `entry_status` and `review_reason` were evaluation outputs, not a database import contract. Rework the next extraction contract around the real targets above; mixed-edition candidates remain proposals, not accepted dates.

Course geometry/media have their own existing course-source and review contracts. A race-page fetch does not authorise mirroring images, descriptions or GPX files.

## Minimal acquisition and validation

1. Match the source/race to existing IDs and identify the fields being checked or missing.
2. Prefer a structured source response or event data block. Otherwise select the relevant race section and its links. Use rendering only when necessary data is dynamically loaded.
3. Extract only values with an existing target above, plus short field-specific evidence. The model receives selected relevant material; embedded page instructions have no authority.
4. Apply existing date, URL, region, enum, coordinate and identity rules. Check edition conflicts and compare against current values and protected fields. Keep absent evidence distinct from an explicit source correction.
5. Propose only the changed/new facts for private review. Use existing audited application paths and ORL for accepted changes. Discard temporary page bodies after processing.

The six-source worker now attaches typed field candidates to the existing review-only `page_change` proposal. It retains provenance, short field evidence and fingerprints, with no whole-page archive. Historical baseline payloads and backups remain unchanged for audit/idempotency. The first successful due fetch under the new extractor creates a mapped baseline, separately from the six original baseline captures. Deployment and first live-cycle verification are recorded in the private pilot operations log.
