# Race wayfinding: reviewed destinations

RENM should help runners discover local races and reach useful information wherever it lives. Provider domains alone cannot establish a race's identity, date, entry availability or organiser ownership.

## Reviewed sample

Checked on 28 September 2026 against public destinations:

| Race | Occurrence | Evidence and destination | Outcome |
| --- | --- | --- | --- |
| White Horse Gallop | 18 October 2026 | [EntryCentral](https://www.entrycentral.com/event/128400) | Admit this provider-only occurrence to discovery. Show the dated observation that entries were closed. |
| Wyre Forest Trail Half Marathon & Super Seven Autumn | 18 October 2026 | [EntryCentral](https://www.entrycentral.com/wyrewizardautumn) | Admit this occurrence. Explain the two race choices without promising availability. |
| Dartmoor Way Full Circle 100 & Granite 50 | 2–3 October 2026 | [Find a Race](https://findarace.com/events/dartmoor-way-full-circle-100-granite-50), [OuterEdge](https://outeredge-events.com/) | Restore the useful third-party listing with an explicit label. Distinguish its two dates and dated closed-entry observation. |
| St Valentine's 30K | 14 February 2027 | [SI Entries](https://www.sientries.co.uk/event.php?event_id=17387), [Stamford Striders](https://www.stamfordstriders.org/Pages/St-Valentines-30k) | Show both the provider and club information. Do not infer an opening date. |
| MobMatch26 | 29 November 2026 | Imported link is the SI Entries homepage | No reviewed admission; a provider homepage does not identify this occurrence. |

The active future dataset contained no PayPal examples. Bare payment-account URLs remain excluded. Payment instructions can be supported on a corroborated organiser page; this release does not invent a live example or assert a payment recipient is verified.

## Implementation and acceptance

`wayfinding-reviews.ts` pins each reviewed record to its ID, sort date and both imported URLs. A changed occurrence or link loses the reviewed override until reviewed again. The existing discovery rules and five original pilot destination manifests remain available. Reviews cover the named destinations, not every fact in the listing.

The shared discovery gate is used by browse/search surfaces and related races. Radius results hydrate reviewed candidates' dates from the public projection because the RPC does not return them. A failed lookup cannot admit a reviewed exception.

The event page labels destinations as entry provider, third-party listing or organiser information, with a dated review note. Generic CTAs describe where they lead; a URL path no longer implies that registration is open. Unverified `Offer/InStock` and inferred organiser identity are omitted from Event structured data. Past occurrences suppress entry/payment actions. Different useful URLs on the same host are retained.

The homelab watchlist adds reviewed destinations and explicit unreviewed candidates, retaining its existing fields. Applying change reports remains disabled. Worker installation and authenticated end-to-end intake require separate operational verification; they are not established by this code release.

## Validation and rollback

Regression tests cover identity/date/URL drift, provider homepage exclusion, past events, payment URLs, unsafe URLs, duplicate links, failed radius enrichment and monitoring roles. Run the complete test suite, TypeScript check and production build before release. Check the four event pages and the affected regional directories after publishing.

Remove an individual review to revoke only its exception, or revert this release to restore the prior policy. No database records or migrations are changed. Google traffic recovery remains an outcome to measure, not an acceptance claim for this release.
