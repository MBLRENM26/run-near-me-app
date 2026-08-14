# RENM soft-404 residual occurrence package

Date: 13 August 2026

Branch: `codex/renm-soft404-residual`

Base: `origin/main@7fdb3126a8a3b6c4652638ce80c1a394cecb02e0`

Status: production data applied 14 August 2026; HTTP/render acceptance in progress

## Outcome

The 47 reported URLs were resolved against the production records before any
package was authored. The result is a guarded, existing-schema data migration:

- 46 stable-ID patches;
- 43 canonical event URLs potentially eligible for later GSC validation;
- two exact occurrences deliberately unchanged;
- one out-of-UK occurrence retired using the existing `HIDDEN` treatment;
- one Dartmoor occurrence assembled from two race-option pages;
- existing duplicate redirects preserved, with one competing Dartmoor row and
  one older Dartmoor alias pointed directly at the selected survivor;
- no application route, template, indexability, region SSR, MCP, reminder,
  homepage-count, schema, deployment, production or GSC change.

The source-resolution document that authorised this work remains the evidence
index. The exact production before/after manifest is the `expected` and
`target` JSON embedded in
`supabase/migrations/20260813201539_renm_soft404_residual.sql`. It is
executable as a drift guard: every event ID, slug, source URL, baseline subset
and target value is reviewable before apply. For each of the 25 entries that
changes taxonomy tags, the migration deterministically adds
`is_curated_tags: false -> true` so a later sync cannot erase the reviewed
taxonomy. The migration aborts atomically if
any target is missing, any baseline subset has changed, or any update affects a
row count other than one.

## Pre-flight evidence

| Check | Result |
| --- | --- |
| Repository | `MBLRENM26/run-near-me-app` |
| Local branch before work | `codex/fix-cardiff-course-migration` |
| Local HEAD before work | `9995bdc44199e3d922af99407cb591a0e3159ad6` |
| Authoritative GitHub head | `7fdb3126a8a3b6c4652638ce80c1a394cecb02e0` |
| Lovable recorded source head | `7fdb3126a8a3b6c4652638ce80c1a394cecb02e0` |
| Worktree before work | clean |
| Divergence requiring reconciliation | none |
| Working branch | created from `origin/main` as `codex/renm-soft404-residual` |

## Canonical and redirect resolution

The suffix `-2` was never treated as evidence by itself. Each mapping below
was verified from `status='DUPLICATE'`, `duplicate_of`, and an ACTIVE
survivor.

| Reported or retired URL | Production treatment after package | Canonical |
| --- | --- | --- |
| `/events/athens-authentic-marathon` | clean 404: its existing survivor is retired as out of UK scope | none |
| `/events/dartmoor-way-granite-50` | 301 | `/events/dartmoor-way-100-full-circle` |
| `/events/dartmoor-way-granite-50-dartmoor-2026` | existing legacy alias repointed directly; 301 | `/events/dartmoor-way-100-full-circle` |
| `/events/run-durham-hamsterley-remembrance-day-5-10-miler` | existing 301 | `/events/run-durham-hamsterley-remembrance-day-5-10-miler-2026` |
| `/events/gainsborough-morton-10k-half-marathon` | existing 301 | `/events/gainsborough-morton-10k-half-marathon-2` |
| `/events/chepstow-running-festival-august` | existing 301 | `/events/chepstow-running-festival-august-2` |
| `/events/borders-8-hour-challenge-2` | existing 301 | `/events/borders-8-hour-challenge` |
| `/events/hertfordshire-half-marathon-10k` | existing 301 | `/events/hertfordshire-half-marathon-10k-2` |
| `/events/scottish-half-marathon-north-listing` | existing 301 | `/events/scottish-half-marathon` |
| `/events/chelmorton-chase-2` | existing 301 | `/events/chelmorton-chase` |
| `/events/jon-ward-hereford-5k` | existing 301 | `/events/the-jon-ward-hereford-5k-2026` |
| `/events/littlehampton-10k-2` | existing 301 | `/events/littlehampton-10k` |
| `/events/kingston-half-marathon-2` | existing 301 | `/events/kingston-half-marathon` |
| `/events/windsor-trail-run-half-marathon-10k-august-2` | existing 301 | `/events/windsor-trail-run-half-marathon-10k-august` |

The event loader already returns permanent redirects only when a DUPLICATE row
has an ACTIVE survivor. Sitemap membership is computed from ACTIVE, indexable
rows, so the retired aliases are not sitemap candidates. A repository-wide
literal search found no hard-coded internal links to the Scottish north alias
or the other retired occurrence aliases.

## Record decisions and exact mutation preview

The exact field-level preview is kept once, in the forward migration payload,
to prevent a prose table and executable SQL drifting apart. Its 46 entries
cover:

| Treatment | Stable records | Notes |
| --- | ---: | --- |
| Source-backed canonical enrichment | 41 | Existing fields only: identity, occurrence dates, location correction, race options, distance/terrain tags, fee, official/entry destination, organiser, governance, licence, organiser type, race profile and series key |
| Dartmoor canonical merge | 3 | Full Circle record becomes the compound occurrence; Granite 50 and its older alias point directly to it |
| Athens out-of-scope retirement | 1 | ACTIVE survivor becomes HIDDEN; evidence/source history retained |
| Scottish festival relationship | 1 | Existing half-marathon canonical receives the same series key as Scottish 10K |
| **Total** | **46** | |

No description, marketing prose, image, GPX or unsupported schema field is
introduced. The migration inserts one private `event_edits` audit record for
each row it actually changes, including the evidence URL and exact field diff.
Re-running it is a no-op once every target subset is present.

### Manifest correction found during implementation

The reported `white-horse-gallop` production row is the Westbury White Horse
Gallop on 18 October 2026, not the Uffington White Horse Gallop on 26 July.
runABC and the linked EntryCentral registration page agree on the Westbury
identity, date, venue and 12K distance. The package therefore preserves the
RENM occurrence and enriches it from the matching Westbury EntryCentral
record. It does not apply facts from the different Uffington race.

### Left unchanged

| URL | Reason |
| --- | --- |
| `/events/run-exe-summer-5k-september` | exact September occurrence remains unconfirmed by the current organiser |
| `/events/power-of-5k-race-1` and its existing survivor | exact next occurrence and the meaning of “Race 1” remain unconfirmed |

## Rollback

`docs/renm/RENM-soft-404-residual-rollback-2026-08-13.sql` is the exact
rollback. It reads only audit rows written by this package and restores each
recorded `from` value. Before restoring, it checks every current field still
equals the package's recorded `to` value, so a later edit causes an atomic
abort instead of being overwritten. It then removes only this package's audit
rows.

## Production execution record

On 14 August 2026 the first production apply stopped atomically on the Athens
drift guard before writing any rows. The later EA/region normalisation had
changed that record's pre-state region from `England` to `West Midlands`.
The committed expected subset now reflects that verified production pre-state;
the evidence-backed target and all other package rows are unchanged.

After that reconciliation merged, Lovable applied the package successfully on
14 August 2026. Verification reported:

- 46 `event_edits` audit rows for `renm-soft404-residual-2026-08-13`;
- Athens HIDDEN with country `Greece`, county `Attica` and region `NULL`;
- both Granite aliases DUPLICATE directly to
  `92a0b167-d208-4721-8c9f-b00a7b522f9c`;
- the Dartmoor survivor carrying both race options and the 2-3 October span;
- Run Exe and Power of 5K unchanged.

Lovable recorded the applied migration on main as
`20260814095558_c6b83752-64cd-447f-8d4b-01ace7f42b80.sql`. No application code
changed and no site publish was required for the database mutation.

Remaining steps:

1. run the repository's read-only HTTP/render acceptance harness;
2. inspect and correct only evidence-backed residual failures;
3. submit only the clean canonical set to GSC after acceptance.

The harness and operating instructions are documented in
`docs/renm/RENM-soft-404-residual-acceptance-2026-08-14.md`.

## Post-apply verification and HTTP/render acceptance

Database verification:

- 46 package audit rows exist after the first apply;
- a second apply creates no further rows;
- Athens canonical survivor is HIDDEN and both Athens slugs are absent from
  discovery/sitemap;
- both Granite aliases have `duplicate_of` equal to
  `92a0b167-d208-4721-8c9f-b00a7b522f9c`;
- the five inspected `-2` rows and the Scottish north alias retain their
  verified survivor IDs;
- Run Exe and both Power of 5K records are byte-for-byte unchanged.

HTTP/render acceptance for every canonical candidate:

- direct request returns 200 without an avoidable redirect;
- canonical link equals the requested clean URL;
- no `noindex` meta or `X-Robots-Tag: noindex` is present;
- unique date, location, race options and organiser/official-link facts occur
  in server-rendered HTML;
- title, description and Event JSON-LD reflect the supported fields;
- official and entry CTAs resolve to the intended event;
- URL appears once in the sitemap.

Redirect acceptance:

- each mapped alias above returns 301 to its exact survivor;
- no chain or loop;
- alias absent from sitemap and internal links;
- canonical target returns 200 and passes its own acceptance checks.

Athens acceptance:

- both stored slugs are absent from sitemap and discovery;
- neither returns an indexable 200 page.

## Clean canonical URL set for later GSC validation

This is a future eligibility set, not a validation request. All 43 URLs require
successful production apply and render/HTTP acceptance first.

```text
/events/dartmoor-way-100-full-circle
/events/the-cardiff-morun-cardiff-2026
/events/run-durham-hamsterley-remembrance-day-5-10-miler-2026
/events/ytrrc-5k-spring-summer-series-september
/events/gainsborough-morton-10k-half-marathon-2
/events/chepstow-running-festival-august-2
/events/borders-8-hour-challenge
/events/dunoon-ultra-marathon-relay
/events/middlesbrough-10k
/events/white-horse-gallop
/events/leeds-running-festival-august
/events/ponton-plod
/events/armada-athletics-network-5k-september
/events/othnesberys-revenge
/events/speyside-windfarm-challenge
/events/hertfordshire-half-marathon-10k-2
/events/highland-fling-race
/events/william-wallace-running-festival
/events/speyside-way-50k-100k
/events/scottish-half-marathon
/events/kirkcaldy-parks-running-festival-half-marathon
/events/chelmorton-chase
/events/killin-10k-5k-fun-run
/events/scottish-10k
/events/perth-10k-festival
/events/the-jon-ward-hereford-5k-2026
/events/thorpe-park-5k-10k-september
/events/littlehampton-10k
/events/flying-monk-malmesbury-10k
/events/running-grand-prix-oulton-park-august
/events/ten10ten-sheffield
/events/carsington-water-10k-half-marathon-august
/events/peterhead-3k-junior-mile-august
/events/kingston-half-marathon
/events/henley-river-half-marathon-10k-september
/events/dorney-lake-half-marathon-10k-5k-november
/events/wirral-10k
/events/windsor-womens-10k
/events/running-grand-prix-goodwood-october
/events/town-moor-exhibition-park-5k-10k-october
/events/regents-park-5k-10k-november
/events/run-heaton-5k-10k-half-marathon-october
/events/windsor-trail-run-half-marathon-10k-august
```
