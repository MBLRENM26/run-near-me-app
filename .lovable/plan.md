## What's next

Two workstreams are queued after the Scottish Athletics ship. Recommending we take them in this order:

### 1. B5 — Extend the discovery gate for governance-permitted events (small, high-leverage)

**Problem.** `hasOrganiserOwnedLink` (src/lib/link-trust.ts) excludes any event whose only external link sits on an entry platform (sientries, racebest, sport80, justgo, …). That gate is right for random scraped rows, but it's over-strict for events we already know are governed — an England Athletics / Scottish Athletics / Welsh Athletics / Athletics NI / TRA permit is itself a trust signal. Result today: a permitted club race whose only link is `sientries.co.uk/…/event-page` is hidden from the homepage, region pages, distance pages and cross-links, even though its event detail page renders fine.

**Change.** Extend the discovery gate to admit an event when EITHER:
- it has an organiser-owned link (current rule), OR
- it has a trusted governance tag (`england_athletics`, `scottish_athletics`, `welsh_athletics`, `athletics_ni`, `tra`) AND a trusted event-specific link (entry-platform links count, aggregator links still don't).

No change to the event detail page — CTAs there already use `classifyEventLink` directly, so "Enter now → sientries" keeps working for people who land on the page.

**Where it applies.** Anywhere `hasOrganiserOwnedLink` is currently used as the discovery filter: homepage curated lists, `/running-events/$slug` (regions), distance pages (`/5k-races`, `/10k-races`, `/half-marathons`, `/marathons`, `/ultra-marathons`, `/trail-running-events`, etc.), region×distance matrix, and same-town / related blocks on event pages.

**Deliverable.** New helper `hasDiscoverableLink({ entry_url, organiser_url, governance })` in `src/lib/link-trust.ts` (or a thin wrapper next to it). Swap call sites over. Before/after count on the homepage + one region + one distance page so we can see the lift.

**Out of scope.** No schema changes, no copy changes, no new pages. Aggregator hosts (runabc, timeoutdoors, findarace, EA/SA/WA/NI listing pages) stay untrusted everywhere.

### 2. C — Audience value pages (`/for-runners`, `/for-clubs`, `/for-organisers`)

The nav / footer already imply these exist in spirit; they don't as routes. This is the "why should I use this site" answer for each audience, and it's what the original ask ("more detail on why runners / clubs / organisers should use it") was pointing at. Own copy, own route files, own head metadata, linked from the footer. Draft copy for your review before writing files.

Queued after B5 so we ship the discovery win first (visible on every landing page immediately) before spending a turn on marketing copy.

### Recommendation

Start with **B5** this turn — pure logic change, no copy to approve, and I can give you a concrete before/after count on how many extra permitted events surface across the discovery pages. Then move to **C** once you're happy with the lift.

Shall I proceed with B5?
