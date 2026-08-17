# RENM — Outbound wayfinding and source-graph pilot

Date: 14 August 2026

Status: completed and production-accepted on 15 August 2026 as a bounded code-only showcase. The follow-on QL1 semantic/data correction is separately production-accepted. No nationwide organiser graph, filter rollout, bulk enrichment or outreach is approved.

## Product question

Can RENM improve the runner journey by presenting distinct, trustworthy next destinations—licence record, organiser details and entry—without pretending that one external page controls every role?

This is an enabling PX1-to-PX2 pilot, not a new platform strategy. It applies decisions D28–D35 and D58–D61 to two observed journeys and should inform the later course-rich event-page test.

## Observed dry runs

### Saturn Running / TRA / Eventrac

RENM occurrence: `/events/im-not-throwing-away-my-shot-run-tra`

Current event ID: `adb1a4f8-504d-44bd-99d0-94d8b6346542`

Observed journey:

1. RENM exposes one generic `View event details` link to TRA.
2. TRA permit 8570 identifies the 15 August 2026 occurrence and links to Saturn Running.
3. Saturn's event-specific page provides the race details and entry action.
4. Saturn's custom-domain event site and checkout are powered by Eventrac; Eventrac's Saturn tenant also lists the occurrence.

The current RENM row has `source = tra`, the TRA record in both `source_url` and `organiser_url`, `licensed = true`, no named organiser, no organiser entity and no `entry_url`. The licensing source is therefore being presented as though it were the organiser destination.

### Friday Night Under the Lights / England Athletics / OpenTrack

RENM occurrence: `/events/friday-night-under-the-lights-race-series-26`

Current event ID: `2eda5231-ac29-4b4d-bebd-e4f98dd24bf6`

Observed journey:

1. RENM exposes `Race website` to the FNUL site.
2. The organiser site explains the race but entry continues on OpenTrack.
3. The OpenTrack occurrence identifies the 11 September 2026 event, entry state and organiser contact route.

The current row has `source = england-athletics`, no named organiser, `organiser_type = governing_body`, and the FNUL homepage duplicated into `organiser_url` and `entry_url`. OpenTrack is not represented. The RENM detail page also reveals same-named sibling occurrences, so series identity and occurrence identity remain a related later correction.

A public organisational contact was found during the dry run, but no message was sent. Contact details and outreach eligibility remain private under D31 and D36 and are not reproduced here.

## Approved pilot

Use the existing event fields first:

- preserve the licensing/import authority in `source` and `source_url`;
- populate the supported organiser identity and `organiser_url`;
- populate the most direct current `entry_url` where one exists;
- retain `licensed` as a separate fact rather than an organiser classification;
- do not force organiser type when the evidence does not support a stable category;
- keep all data corrections reversible and privately audited.

On the event page, replace the ambiguous single outbound action for the pilot rows with a small server-rendered destination panel. Supported roles are:

- `entry` — direct current registration or the organiser event page that owns the entry action;
- `official_details` — organiser-controlled occurrence information;
- `licence` — TRA, RunBritain or another governing/licensing record;
- later only: `course` and `results` when independently evidenced.

The UI must deduplicate identical URLs, name the role/provider before the click and preserve the existing trust gates. Analytics must continue to record conservative `Outbound Click` events with `destination_role`; a click remains a hand-off, not an entry.

## Acceptance

- Saturn exposes a direct supported Saturn event/entry destination and a distinct TRA permit destination; the runner no longer has to discover Saturn only by bouncing through TRA.
- FNUL exposes its official race website and the specific OpenTrack entry occurrence as distinct destinations.
- Labels set the expected destination before the click; no generic or duplicate buttons remain for the pilot rows.
- Destinations render in SSR, remain accessible on mobile and desktop and introduce no console, TypeScript, unit, build, canonical, robots, structured-data, sitemap or soft-404 regression.
- A read-only production-data preview, exact mutation scope, private audit rows and rollback are reviewed before data writes.
- No outreach is sent from this package.

## Promotion gate

Do not add national filters or a broad schema before the pilot is accepted. After a varied 6–10 event sample demonstrates stable roles, approve separately if needed:

- an additive `event_destinations` relation for multiple current role-specific URLs;
- a durable organiser entity/classification model;
- licence/permit relationships;
- evidence-backed filters such as club-organised, independent/commercial and governing-body permitted.

Registration provider, organiser type and licence status remain separate dimensions. No organiser portal, CRM, booking system, contact database, automated outreach or universal `update once, publish everywhere` commitment is implied.

## Approved showcase variation — 15 August 2026

Mike chose not to mutate production rows for a partnership call that may or may not produce a partnership. The accepted implementation therefore uses exact-row, fail-closed, human-reviewed code manifests. A manifest renders only while every reviewed row value still matches; drift restores the legacy CTA path rather than making an inference.

The live showcase is:

1. FNUL: OpenTrack entry plus the official FNUL site (two destinations).
2. Rubber Ducky Waddle: Saturn/Eventrac entry, approved TRA permit 8571 and the Saturn course map (three destinations).
3. Sedgefield Serpentine 2026: Sport:80 entry, Sedgefield Harriers official page, England Athletics listing, 2026 athlete information and 2026 course map (five destinations).
4. Hertfordshire Half Marathon & 10K: RunThrough entry and the official event website (two outbound destinations). The existing RENM course selector and embedded 10K/Half Marathon maps remain the route experience; there are no separate Strava exits in this panel.

The original Saturn/TRA permit 8570 pilot remains available unchanged. Identical URLs deduplicate behind the higher-priority role.

Public semantics remain deliberately narrow:

- Sedgefield's England Athletics destination is labelled `Governing-body listing`, not licence, licensed or approved.
- The Rubber Ducky TRA page is labelled as an approved permit because the reviewed permit record states that status.
- RunThrough is presented as the commercial organiser and registration provider for Hertfordshire; no England Athletics relationship, absence or licensing status is asserted.
- Private runABC provenance and FNUL's private import provenance do not appear in rendered HTML, user-facing copy or analytics.
- Before the race, entry is the dominant action. After the occurrence is past, entry is suppressed; an exact reviewed results destination would become primary, otherwise the primary slot is the non-clickable status `Race completed` / `Results coming soon`. Official, listing/licence and course links remain available. No historical result is presented as a current result.
- Final visible signposts name both the action and destination where ambiguity matters: `Enter via OpenTrack`, `Enter with Saturn Running`, `Enter via Sport:80`, `Enter with RunThrough`, `View TRA permit 8570/8571`, named organiser websites and `England Athletics listing`. Provider/role/host detail remains in accessible names and analytics.
- The pale signpost rail shrink-wraps its reviewed controls on desktop and uses the full available width only on narrow screens. It does not create empty-looking slots or stretch the primary control to match a multi-row secondary grid.

## Production acceptance — 15 August 2026

- Lovable project: `fa471d0b-8fb1-4a40-afd4-c20d7685abc1`.
- Cumulative application head: `5096035e07723182c52de8ea479b44a0df94f0da` (final agent implementation commit `d1bf3af9722fa5d9a5dc4d96b1339d5f1d20298f`; approval baseline `bd51a622aa6f88685adeb8c8adbf34809d30ac5f`).
- Production deployment: `9498494c-6ce0-49ae-a3ea-4a4eba044de2`.
- Changed application files: `src/lib/pilot-destinations.ts`, `src/components/events/DestinationPanel.tsx`, `src/routes/events.$slug.tsx` and their two focused test files.
- Verification: 22 test files / 180 tests passed; typecheck, scoped lint and production build passed. All four canonical production pages rendered the expected reviewed hierarchy and destinations at desktop/mobile test widths. Public DOM inspection found no runABC provenance; Hertfordshire rendered no Strava outbound signpost and retained its embedded course selector.
- Analytics: only deliberate clicks on rendered outbound anchors emit `Outbound Click`; `booking_destination` is used for entry, `licence_record` only for reviewed TRA permits and `official_information` for official details, governing-body listing, athlete information and course destinations.
- Data effect: none. No row write, audit-row insert, migration, schema change or connector change occurred.

Rollback is code-only: redeploy application head `cbff1f63d7f958fd9c9f21146129537df4823990` (the pre-showcase head) or revert the five-file cumulative change. There is no data rollback because no data changed. The unrelated `.tmp-bun-renm` directory remains untouched.

## Pilot closure and hand-off — 15 August 2026

The outbound-wayfinding pilot is complete. Its SSR panel, count-aware hierarchy, post-race lifecycle, trust gates, URL deduplication, accessible labels and conservative `Outbound Click` roles are production-accepted across Saturn, FNUL, Rubber Ducky, Sedgefield and Hertfordshire.

QL1 subsequently corrected licence-state wording and the Sedgefield organiser identity at application head `4cb0f2280a3b8a8e5a904b2a2056ae72dc037ed9`; its separate acceptance and recovery audit are recorded in [the QL1 acceptance](RENM-event-page-information-depth-QL1-preview-2026-08-15.md). This does not alter the original code-only pilot's zero-data-effect statement.

No additional pilot test, publish or mutation is required before beginning QL2 read-only data evidence and mutation previews. Remaining work is deliberately outside pilot closeout:

- QL2 occurrence rectification requires evidence-backed before/after rows and separate approval before any production write;
- QL3 club/entity coverage and QL5 durable destination/schema decisions retain their own gates;
- the temporary Sedgefield transition alternative may be removed only through a later separately tested deployment after the corrected row is stable.
