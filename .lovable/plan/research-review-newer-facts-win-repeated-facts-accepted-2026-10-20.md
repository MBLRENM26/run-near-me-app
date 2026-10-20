# Research review: newer facts win, repeated facts accepted

## New rules (rule version 2)
1. **Newer wins.** If a newer research pass gives a different value from an older one, the newer value is accepted and the older one is retired. Both stay on record. This only applies when the newer fact passes all the other checks: it's verified, quoted from the organiser's own site, and for the right year's race.
2. **Confirmed twice means accepted.** If the same value is found more than once, it is accepted automatically, even when one copy had a small flag like "second supporting quote not stored". That covers the same value from two pages, two websites or two passes.
3. **Still always sent to you:**
   - two values that clash within the same pass
   - the wrong year's race
   - entry status and course maps, which are still never accepted automatically
   - facts that are only on a booking or listing site and that nothing else backs up

## Safety
- Every automatic decision is labelled "rule v2", so all of them can be undone in one go, just like v1.
- Your own decisions always beat the automatic rules. Nothing you've already approved or ignored will be touched.
- Race pages and listings stay as they are, and these facts still aren't shown publicly.

## About the organiser review layer
It isn't made redundant by this. It answers a different question: **who** runs a race (which club or company). It also controls the "Organised by …" links. This research only gives facts **about** a race, like start time or terrain. Getting the organiser wrong means crediting the wrong club, so that stays a deliberate check. Later, research that names an organiser could feed that layer as supporting evidence, but that's a separate step.

## Technical details
- In `src/lib/research-auto-review.ts`, add `AUTO_RULE_V2` and a pure `resolveGroup(facts)` over each slug+field group:
  - newest batch by `created_at` wins if it passes v1's eligibility, ignoring only the cross-batch "Differs" caveat
  - corroboration means at least 2 assertions with the same normalised value across distinct `source_url` or batch
  - a corroborated value treats `"Source page also gave a second supporting quote"` as harmless
  - a corroborated value is allowed from a booking host only if at least one source is organiser-owned
- Write v2 decisions to the existing append-only reviews table: `auto_accept` for the winner, `reject` with note "Superseded by newer pass" for older values.
- Skip any assertion that already has a human review.
- `revokeAutoRule` already works per rule version. Extend it so it also reopens the v2 supersede rejects.
- Add tests, one per rule:
  - newer value wins
  - a newer value from the wrong year doesn't win
  - corroborated values are accepted
  - a clash within one pass still comes to you
  - a human decision is never overridden
  - entry status and course maps are never auto-accepted
- Check the events fingerprint before and after.
