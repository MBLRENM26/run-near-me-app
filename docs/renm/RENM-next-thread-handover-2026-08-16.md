# RENM — next-thread handover

Date: 16 August 2026  
Status: current handover for the QL2 data-quality work cycle.

## Read order and authority

Read `RENM-CURRENT.md` first, then this handover, Project Knowledge, the data/lifecycle contract, decision register, phased build brief and the linked QL1/gap-map evidence. Mike's latest explicit instruction remains highest authority. The 2 August handover is a historical containment snapshot, not an active opening prompt.

## Verified current position

- Application repository: `MBLRENM26/run-near-me-app`; accepted application code baseline `4cb0f2280a3b8a8e5a904b2a2056ae72dc037ed9`. Later documentation-mirror commits do not change the verified runtime baseline; re-read the actual default-branch head before work.
- QL1 replacement production deployment: `f792f012-96d9-481a-8e62-55845076d5e1`.
- The outbound-wayfinding pilot and QL1 are complete and production-accepted. Five reviewed occurrences retain their expected hierarchy: Saturn 2 exits, FNUL 2, Rubber Ducky 3, Sedgefield 5 and Hertfordshire 2 plus the on-page course module.
- Licence semantics are state-aware: only canonical exact `licensed='true'` produces `permitted`; FNUL remains neutral `England Athletics`.
- Sedgefield is canonically `organiser='Sedgefield Harriers'`, `organiser_type='club'`, `organiser_club_id=NULL`; its forward/rollback/recovery audit history is retained.
- `Outbound Click` and conservative `destination_role` remain hand-off analytics, not entry, revenue or organiser-value evidence.
- Lovable Project Knowledge is generated from the current kernel and must match it exactly. GitHub's `docs/renm/` directory is a mirror of the governed control-plane documents, not a competing authority.

## Next objective

Begin QL2 read-only evidence and exact existing-schema mutation previews for:

1. Rubber Ducky organiser, normalised location and supported race-format/distance facts;
2. Sedgefield residual location/profile facts beyond the accepted organiser/type correction;
3. Hertfordshire terrain/race profile; and
4. any source-supported FNUL location correction that does not misuse town as venue.

Return the read-only rows, evidence URLs, exact proposed public effects, private audit rows, rollback and cumulative code/data diff for review before any production write or deployment. Do not infer organiser type from a website, registration provider or licensing body. Saturn currently names the organiser but has canonical `organiser_type='unknown'`, so no organiser-type badge is warranted without an approved evidence-backed correction.

## Rollout principle

Do not scale the five exact code manifests by hand across the catalogue. QL2 and QL3 should measure and correct canonical occurrence/entity coverage first. Only after the varied sample should QL5 decide whether a durable role-specific destination/licence relation or other schema is justified.

## Outstanding but not blocking QL2 read-only work

- remove the temporary Sedgefield identity-transition alternative only through a later separately tested deployment after stability;
- investigate County Durham/club coverage and Sedgefield Harriers entity linkage under QL3;
- retain the QL5 venue/destination/schema gate;
- obtain permission and edition confirmation before custom North Downs route-file reuse;
- keep reminder automation inactive and fail-closed.

## Boundaries

No bulk enrichment, national organiser graph, organiser portal, CRM/contact database, automated outreach, historic-subscriber messaging, GSC action, security package, schema migration or production-data write is implied by this handover. Keep organiser, organiser type, licensing body/state, governing listing, registration provider and private acquisition provenance separate. Do not touch `.tmp-bun-renm`.

## Opening prompt

Continue RENM from the 16 August 2026 handover. Verify the application/GitHub/Lovable head and production rows read-only, then prepare the bounded QL2 evidence and exact mutation preview. Preserve QL1 and the five pilot journeys, keep private provenance private, and stop for Mike's approval before any production write or deployment.
