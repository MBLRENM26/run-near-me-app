# RENM — Event-page information-depth gap map

Date: 15 August 2026

Status: read-only pilot audit accepted as the PX1 quality-of-life rectification map. QL1 is production-accepted; QL2 is next and begins read-only. This document approves no further application, schema or production-data mutation; every package retains its own preview, audit and rollback gate.

## Question

What does RENM already store or resolve for an occurrence, what reaches the event-detail renderer, and what does the runner actually see?

The outbound-wayfinding showcase exposed that correct exits and information depth are separate quality dimensions. Several pages now point runners to the right external destination while their own occurrence facts remain sparse, overly broad or semantically wrong.

## Evidence and boundary

This map combines:

- read-only production-connected queries of the four showcase event rows, their published course rows and club coverage;
- the live server-rendered event pages on 15 August 2026;
- current-head inspection of `getEventPageData`, `TrustProfileStrip`, `CourseIntelligence`, `courseProfileFromSources`, `buildAboutParagraph`, club matching and the reviewed destination manifests.

Private `source` and `source_url` remain provenance only. Reviewed external evidence may propose a canonical fact, but does not become a public assertion merely because it appears in a manifest or source page.

## Pilot gap matrix

| Occurrence | Stored or resolved | Currently presented | Material gap | Classification |
|---|---|---|---|---|
| FNUL | Exact 11 September date; London town/county; 5K/road tags; organiser text; OpenTrack entry; FNUL site; EA governance; recurring `series_key`; coordinates that map inside Battersea Park (inference, not a stored venue) | London; 5 km; road; organiser line; neutral `England Athletics`; entry/site signposts; generic About copy | Battersea Park is not stored as a venue; series context is not projected | missing canonical venue; available but not projected; generic copy limitation |
| Rubber Ducky | Exact date; TRA governance; `licensed='true'`; trail profile; raw location `Clarence Street, Surrey, England`; coordinates; £33 legacy fee; reviewed Saturn/Eventrac journey, permit 8571 and course page | Date; trail/TRA badges; three signposts; no location, distance or organiser line; generic About copy | Town/county, race format/distances and organiser are missing canonically; permit/provider facts live only in reviewed code evidence; no stored course metrics | missing canonical data; private evidence requiring governed derivation; generic copy limitation |
| Sedgefield | Exact date; 10 km; multi-terrain; `organiser='Sedgefield Harriers'`; `organiser_type='club'`; County Durham/postcode evidence; Sport:80; Sedgefield Harriers site; EA listing; athlete/course PDFs; `licensed='true'` | Stockton-On-Tees, County Durham; 10 km; `England Athletics permitted`, `Club-organised` and multi-terrain badges; organiser line; five signposts | Sedgefield Harriers is absent from 1,638 clubs and `organiser_club_id` remains null; County Durham has zero club rows; no canonical venue/course metrics | entity-linkage and source-coverage failure; missing canonical data |
| Hertfordshire | Exact 1 November date; Knebworth/Hertfordshire; RunThrough/commercial; two published course rows: 10 km/92 m and 21.1 km/218 m | Exact location/date; organiser; two signposts; interactive route selector, metrics and embedded maps | Course richness is already presented but excluded from the generic About copy; terrain/profile fields remain thin | generic copy limitation; missing canonical classification |

## System findings

### 1. QL1 resolved governance/association and permit-state collapse

The production event-detail loader now selects `licensed`. Only a trimmed, case-insensitive exact `true` produces `... permitted`; null, false, malformed and legacy free text fail closed to a neutral body label. FNUL is therefore neutral `England Athletics`, while supported Sedgefield and TRA records remain permitted.

The public model must treat these separately:

- governing/association body;
- verified licence/permit state;
- exact licence/permit record and identifier;
- organiser;
- registration provider.

### 2. The About paragraph is intentionally generic

`buildAboutParagraph()` accepts only name, distance bucket, town/county/region, date, official-link presence and a regional count. It cannot mention organiser, venue, licence, permit number, registration provider, series or course metrics even when the server has them. This is a renderer-input limitation, not an instruction to generate longer speculative prose.

### 3. Venue is not canonical

`events` has town, county, region, coordinates and `location_raw`, but no venue field. `location_raw` is source text and cannot safely double as a canonical venue. FNUL/Battersea Park and Sedgefield's runner-relevant venue demonstrate the residual need; a schema change remains gated until a varied sample confirms the representation.

### 4. Entity linkage still depends on canonical entities and organiser evidence

The page links an organiser to a club through `organiser_club_id`, then falls back to conservative name matching. QL1 supplied Sedgefield's organiser text and club classification, but there is still no club row or FK target. The zero County Durham club count indicates a coverage/import problem that must be investigated before manually creating one isolated club.

### 5. Course evidence has two states

Hertfordshire has published structured course rows and already renders distance/ascent metrics. Rubber Ducky and Sedgefield have reviewed external course destinations but no structured metrics. A link proves a destination exists; it does not by itself authorise extraction or establish canonical elevation.

## Bounded remediation sequence

### QL1 — semantic trust correction — complete

1. Select `licensed` for the server-rendered event detail.
2. Replace governance-to-permit labels with state-aware rendering: neutral body/listing language when permit status is unknown; `permitted` only when the canonical state or exact reviewed record supports it.
3. Correct Sedgefield's organiser type and organiser identity only through a separately approved, reversible two-row-style mutation preview and private audit record.

Acceptance passed on 15 August 2026: FNUL makes no permit claim; Sedgefield no longer calls a club race a governing body; exact TRA permit claims remain supported. See [QL1 production acceptance](RENM-event-page-information-depth-QL1-preview-2026-08-15.md).

### QL2 — existing-schema occurrence rectification

Prepare evidence-backed previews for:

- Rubber Ducky organiser, normalised location and race-format/distance facts;
- Sedgefield location/profile corrections beyond the accepted organiser/type fix;
- Hertfordshire terrain/race profile;
- any source-supported FNUL location correction that does not misuse town as venue.

Do not render `location_raw` automatically. Normalise and review it first. Do not copy source descriptions or turn registration providers into organisers.

### QL3 — club coverage and identity resolution

Audit the England Athletics/club intake and region normalisation that produced zero County Durham clubs. Resolve Sedgefield Harriers as an entity candidate, then use the existing club FK/backfill path after entity evidence is accepted. Do not create a national organiser graph from this one case.

### QL4 — useful fact projection

Prototype a concise server-rendered facts layer from already public, typed evidence:

- organised by;
- entry/registration provider;
- governing body versus verified permit/licence;
- exact reviewed permit number where the public relation supports it;
- race format/profile;
- course distance/ascent when a published structured course row exists;
- other dates in the same series from accepted series identity.

Prefer a compact fact list and targeted sentences over a longer generic paragraph. Avoid duplicating facts already clear in the header, signposts or course module.

### QL5 — residual schema gate

After a 6–10 occurrence sample, decide separately whether demonstrated residuals justify:

- a nullable canonical venue field or venue entity;
- a durable role-specific destination/licence relation with permit identifier;
- claim-level source/freshness fields needed for safe public restatement.

No broad migration precedes the sample. The current manifest remains a pilot evidence surface, not the general data model.

## Measurement and acceptance

Track completeness as typed runner-useful facts, not word count:

- exact date and runner-relevant location/venue;
- organiser identity and optional linked club/entity;
- correct organiser type;
- governing body and licence state kept separate;
- direct entry destination/provider;
- race format/distances/profile;
- useful course/results state where evidenced;
- no unsupported statement, duplicate fact or private provenance leak.

Each package needs read-only before/after rows, evidence URLs, exact public-copy effects, SSR/unit tests, desktop/mobile inspection and rollback. No outreach, GSC action, bulk enrichment or unrelated schema/security work is implied.
