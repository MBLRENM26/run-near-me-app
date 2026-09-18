# Earning its keep — evidence before spend

Goal: find out, with real numbers, which of paid listings, runner subscription, affiliate entries or ads could actually pay — before building any paid product.

## What the site already promises (constraints we must not break)

Checked the live pages today:

- Organisers page: "The standard listing is free, permanently" — and it already says optional **partnership and featured-placement** options are in development. So paid placement is open, as long as the free standard listing stays free.
- Clubs page: free club listing, "no signup", and we state we are independent of the governing bodies.
- Runners page: "free to browse and free to enter races through the links" — a paid runner tier must be *extra*, never a paywall on browsing or entry links.
- Privacy page: "We do not use cookies for tracking or advertising. We do not sell" personal data. So any advertising must be contextual and cookie-free, or that page changes first as a separate decision.

On reselling governing-body data: correct — the EA/SA feeds are not ours to license. Anything sellable has to be the work we add: resolved identity, verified next action, recurrence history, geography, demand signals. That is a later question, not now.

## The evidence to gather (this package)

An admin-only **Revenue evidence** page, read-only, answering four questions from data we already hold:

1. **Runner demand depth** — how many visitors go beyond one page, return, use postcode search, or click through to an entry; how many reminder requests exist. This is the only honest test of whether a runner subscription is plausible.
2. **Organiser reach** — per organiser/club with future events: how many event pages, how many outbound hand-offs, and whether the link is organiser-owned. This is the pitch sheet for a paid or featured listing, and it tells us how many organisers have enough traffic to be worth charging.
3. **Entry-platform exposure** — how many outbound hand-offs go to each entry platform. Affiliate income only exists where there is volume on a platform that runs a programme, so this ranks which ones are worth approaching.
4. **Page value pool** — future-dated, discovery-eligible pages and their impressions/clicks, so we can size what any ad or sponsorship slot would actually be worth per month.

Each number is labelled with what it is and is not: a hand-off is not an entry, not revenue, not organiser value.

## Decision gates

The page ends with four plain thresholds, so the next spend is triggered by evidence rather than optimism. Suggested starting points, adjustable:

- Runner subscription worth prototyping if there is a repeat-visit cohort and a meaningful number of reminder/alert requests per month.
- Paid or featured listing worth a manual sales test if a workable number of organisers each have enough monthly hand-offs to make a fee defensible.
- Affiliate worth approaching if one platform holds a clear majority of hand-offs.
- Ads worth revisiting only above a monthly page-view floor, and only in a contextual, cookie-free form.

## Then — the cheapest first test (separate approval)

Once a gate is met, the first paid path should be a **manual** test, not software: offer featured placement to a handful of organisers who already have demonstrated traffic, with a real evidence pack, and see whether anyone pays. No portal, no billing integration, no self-serve until someone has paid twice.

## Boundaries

Read-only. No schema, data, migration, discovery-gate, event-page, link, analytics or provenance changes. No payment provider enabled, no pricing published, no public copy changed, nothing deployed. Governing-body data is not offered for resale.

## Technical notes

- New admin route under the existing `_adminShell` gate, alongside `/admin/recurrence`.
- Read-only server functions in a new `src/lib/revenue-evidence.functions.ts`, admin-gated the same way `admin-recurrence.functions.ts` is, reading `events`, `subscriptions`, `sync_runs`, existing search-click tables and `clubs`/organiser links. Internal columns stay out of any public projection; `source`/`source_url` untouched.
- Outbound and entry-platform counts derive from the existing `Outbound Click` analytics and `classifyEventLink`/`isEntryPlatformHost`; no new tracking, no new events, no change to `destination_role`.
- Search-performance figures pulled from the linked Search Console connection at render time; no storage of new datasets.
- Thresholds live in one exported constant object so they are reviewable and easy to adjust.
- Focused unit tests for the pure aggregation and threshold logic.
