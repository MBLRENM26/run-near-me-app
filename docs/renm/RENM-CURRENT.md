# RENM — Current Operating Kernel

Status: canonical short-form context for Mike, Codex and Lovable. Linked contracts retain authority; Lovable context is generated from this file.

Last reviewed: 7 August 2026

## Authority order

When instructions conflict, use:

1. Mike's latest explicit instruction.
2. This current operating kernel for immediate state and boundaries.
3. [Project Knowledge](RENM-project-knowledge.md).
4. [Data and Lifecycle Contract](RENM-data-lifecycle-contract.md).
5. [Decision Register](RENM-decision-register.md), interpreted through the generated decision ledger.
6. [Phased Build Brief](RENM-phased-build-brief.md).
7. Dated audits and findings in `docs/current/`.
8. Historic Bibles, archived prompts and earlier chat as supporting history only.

Conflicts must be raised. Never silently combine a superseded fact with a current decision.

## Verified operating baseline

- Verified merged app head: `6a360e20c17af8cc31c9bced07d28a35b4717d14`; local and origin `main` matched at the start of the 7 August L3B-4 run.
- Containment baseline: `c1cdc4a7e9ae4d16766125f7e56509affe6b79d4`; later acceptance is recorded below.
- Full TypeScript check clean, 31 tests passing and production build passing at that baseline.
- Reminder job 6 is inactive; HTTP fulfilment fails closed with `503` unless `REMINDER_SENDING_ENABLED=true`. No scheduled reminder was sent; first requests do receive an automatic transactional confirmation.
- Twenty-five requests are stored; none is unseen or marked sent. The newest is the 2 August controlled test: demand evidence only, not fulfilment, entries or value.
- Confirmation-copy hotfix `92123320...` is live (38 tests/build passed). The form remains under approved record-level manual monitoring.

## Demonstrated product and open hypothesis

Demonstrated journey:

`Google/AI → RENM occurrence page → correct official/entry destination`

RENM has observed occurrence-page traffic followed by outbound hand-offs. Outbound clicks are not registrations, revenue or organiser value.

Next validation is an attributed distribution test. The 90d review found 832 strict-labelled visitors, but Adnams and Meteor are not clean entry. Cock Crow was not contacted because it cannot observe third-party booking. On 4 August Mike sent RunEvents one no-cost featured-race pilot approach; outcome pending, with no entry, revenue or value claim.

The wider canonical organiser/series/occurrence and authorised change-distribution concept remains plausible but unvalidated.

## Active non-negotiable boundaries

- Do not activate, repair or test automated reminder sending against real subscribers.
- Do not message historic subscribers or perform bulk/backfilled reminder messaging.
- Do not import Kent, South London or other regional research into production before staging and reconciliation exist.
- Do not build an organiser portal or universal `update once, publish everywhere` system.
- Do not expand SEO inventory or start a repository-wide refactor.
- Do not delete history merely because an occurrence passed or disappeared from a source.
- Do not expose personal contact data, private prospectability notes, raw provenance or moderation fields in public projections, strategy documents or Lovable context.
- Do not claim that clicks equal entries, registrations, revenue or organiser value.
- Every implementation package requires separate approval, migration, rollback, tests and production acceptance evidence.

## Current work state

- K1 knowledge control: complete. This kernel, hashed manifest and generated ledger govern the local canon; governed documents and deterministic Project Knowledge are mirrored to Lovable.
- L1 is complete subject to reconciliation: live `events` has 41 columns; anonymous access has 38, excluding `source`, `source_url` and `organiser_club_id`.
- L2 is complete: 2,972 structural/2,522 link-aware rows; dated non-estimated candidates with proposed non-duplicate gating were 1,552/1,114. A six-row snapshot difference remains. The 5,368 headline is not a discovery count; surface/date rules disagree, undated/estimated rows enter discovery and terminal state lacks an owner. No change is approved by these findings.
- L3A is live: `events_public_v1` exposes 25 ACTIVE-only columns without adding discovery/lifecycle rules. Acceptance showed 5,406 equal rows, retained 38 mapped ACTIVE rows, SELECT-only public roles and no data/base-grant/RLS/legacy-view change.
- L3A-R migration `20260802152800_...sql` set invoker semantics with the barrier retained; linter `0010` is clear (`e643fa8...`). The scanner label remains ignored although fixed; unauthenticated MCP remains open.
- L3B-1 region is complete at `624c65d9...`; tests/build and 14 ordered-ID comparisons passed after correcting Lovable's baseline divergence.
- L3B-2 homepage is complete at `659f7756...`; only `src/routes/index.tsx` changed, and production retained all nine cards in order without errors.
- L3B-3 county is complete: `county.functions.ts` uses the view without the redundant ACTIVE predicate; the dedicated projection regression passed 4/4, the full suite passed 49/49, TypeScript and production build passed, and representative London, Devon and West Yorkshire pages rendered without console errors. Acceptance is recorded in `RENM-L3B3-county-consumer-migration-acceptance-2026-08-07.md`.
- L3B-4 city is complete at `f05895a...`: page and sitemap queries use the view without redundant ACTIVE filters. All 40 city ordered-ID comparisons and the 2,831-row bulk comparison matched; sitemap membership/counts matched for 39 eligible cities. Regression 4/4, full suite 53/53, TypeScript and build passed. Live London, Manchester and Aberdeen rendered 248, 100 and 11 matching cards/links with zero console errors; the sitemap retained 39 cities and excluded Dundee. See `RENM-L3B4-city-consumer-migration-acceptance-2026-08-07.md`.
- At `9558063`, event-detail analytics changed from `Entry Click` to `Outbound Click` with conservative analytics-only `destination_role`. Historical data stays separate; a click is only a hand-off. This is not public/data-layer L6 and changes no CTA, trust or discovery rule.
- No L3C base-grant hardening or L4 eligibility implementation has been approved. L3B must continue, if approved, one separately bounded consumer group at a time; every prompt returns to Mike before sending.

## Phase 1 order

1. Continue L3B only when proportionate. Region, homepage, county and city are complete. Migrate any later consumer group only as a separately approved bounded package.
2. L3C base-table grant/RLS redesign only after zero required public dependencies are proven. The invoker view cannot survive full underlying grant revocation by itself; choose separately between exact 25-column base grants plus an ACTIVE RLS policy or another approved server-side boundary.
3. L4 one shared future/canonical discovery eligibility rule.
4. L5 reversible quarantine of exact approved test records and reviewed duplicate batches.
5. L6 destination role, validity and verification state.
6. Define ownership for cancellation/postponement/terminal occurrence lifecycle state before implementing it; do not assign it to L6 by implication.
7. L7 logical source-run manifests, material-change reporting and non-destructive source-missing observations.

Kent and South London remain offline throughout these packages.

## Evidence discipline

Label material statements as:

- **Sourced fact:** supported by a named reproducible source.
- **Observed evidence:** directly observed in a defined period with method and limitations.
- **Inference or hypothesis:** an interpretation to test, never restated as fact.

Structural package acceptance is not production promotion. Stored, current/live, discoverable, countable, indexable and enterable-now remain different states.

## High-risk decision pointers

- D28: compete first on trusted occurrence resolution and correct next action.
- D31/D36: publicly contactable does not mean commercially prospectable; outreach research is private.
- D33/D35: organiser control begins as a manual service test; outbound traffic is not organiser value.
- D44 is superseded by D47: a sender and scheduled job existed despite earlier understanding.
- D46: temporary manual monitoring only, with verified facts, purpose, unsubscribe and private logging.
- D48/D49: job 6 remains inactive and HTTP sending remains fail-closed.
- D50 recorded 24 stored requests as behavioural evidence only; the current observed count is 25, with none unseen and none marked sent.
- D53: the containment release is the operating baseline.

The ledger indexes lifecycle state; Decision Register text remains canonical.

## Update protocol

After every approved decision or completed package:

1. Update the relevant canonical document once.
2. Update this kernel only if immediate state, boundaries, active package or authority changed.
3. Run `.\scripts\renm-knowledge.cmd --refresh-hashes`.
4. Commit the canonical changes and generated outputs together.
5. Install the generated Lovable Project Knowledge and sync the governed documents into Lovable.
6. Verify hashes, Project Knowledge content, repository commit and production/deployment state separately.

Do not edit `RENM-lovable-project-knowledge.generated.md` or `RENM-decision-ledger.generated.json` by hand.
