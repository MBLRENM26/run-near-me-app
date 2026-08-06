# RENM organiser validation preflight

Date: 4 August 2026

Scope: reminder monitoring, audited outbound evidence and first public-evidence cohort, followed by one approved partnership approach.

## Reminder monitoring

- **Observed evidence — production database:** 25 reminder requests stored; zero unseen; zero with `reminder_sent_at`; newest request remains 2 August 2026 at 19:49:37 UTC.
- **Observed evidence — send log:** since that request, the only records are its pending and sent `race-reminder-confirmation` states. There is no `race-reminder` send record.
- **Observed evidence — containment:** cron job 6 remains inactive.
- **Decision:** no new case requires review or manual fulfilment today.

No subscriber address or token was extracted into this report.

## Outbound evidence

Observation source: Plausible production dashboard for `runningeventsnearme.com`, observed 4 August 2026 for the exact 90-day window 6 May–4 August 2026.

- **Sourced fact — instrumentation:** `Entry Click` is the RENM custom event fired from event-page outbound CTAs. Its `link_type` property separates `entry`, `organiser-site` and `organiser-other` actions.
- **Observed evidence — strict-labelled hand-offs:** filtering `Entry Click` to `link_type=entry` produced 832 unique conversions and approximately 1,100 total conversions.
- **Observed evidence — destination correction:** 246 unique conversions were attributed to Adnams 10k, but the destination captures interest for ballot/update email and later allocates limited race places. These are not clean entry hand-offs and are excluded from the organiser-entry cohort.
- **Observed evidence — separate automatic event:** Plausible also reported `Outbound Link: Click` separately. It was not added to the custom event counts.
- **Limitation:** these are recorded outbound interactions, not bookings, entries, revenue, incremental demand, human identity or organiser-recognised value.

### Highest strict-entry occurrence evidence

| Prospect ID | RENM occurrence | Unique strict entry conversions | Public role evidence | Reconciliation note |
|---|---|---:|---|---|
| `ORG-V-001` | Adnams 10k | 246 | Adnams PLC operates the event and destination. | Exclude from clean entry cohort: ballot/update-signup journey. Potential data-delivery test only. |
| `ORG-V-002` | The Newick Will Page 10k | 61 | Event-specific registration journey; the event is hosted at Newick Sports Pavilion and the associated trust is a registered CIO. | Clean historical registration evidence, but confirm exact organiser/control role before contact. |
| `ORG-V-003` | Meteor Mile | 28 | Almost Athletes controls the linked event page and identifies the race in its club programme. | Reclassify as official-information traffic: the page has no current registration journey. Hold legal form. |
| `ORG-V-004` | Cock Crow 5K | 23 | Jarrow & Hebburn AC's official page publishes and administers the race; the club is an active company limited by guarantee. | Contact-ready: event-specific registration, general organisational route and zero suppression match. |
| `ORG-V-005` | Aston 5 | 10 | RENM points to an event-specific Race Result destination. | Organiser identity unresolved. |
| `ORG-V-006` | Great Bentley Half Marathon 2027 | 10 | Great Bentley Running Club's own page describes and administers the race. | RENM says 2027 while the linked page describes 2026; reconcile before contact. |
| `ORG-V-007` | Fraserburgh Half Marathon | 9 | RENM names Fraserburgh RC; entry is via Scottish Athletics JustGo. | Confirm club control and legal form. |
| `ORG-V-008` | Middlesex 10k | 9 | Entry is via England Athletics; RENM points to Middlesex AA for organiser context. | Confirm occurrence control and legal form. |
| `ORG-V-009` | Tara Kinder Memorial 10K | 8 | EventEntry presents an event-specific entry page and organiser contact function. | Resolve the operating organisation; do not treat the named booking contact as the organiser. |

### Portfolio candidate

`ORG-V-010` — RunThrough / GW Active Ltd recorded ten unique and eleven total strict entry conversions across multiple RENM occurrence pages in the same period. RunThrough's terms identify GW Active Ltd trading as RunThrough Events as the operator of RunThrough events. This remains the clearest multi-occurrence race-business candidate for the final private contact gate.

## Partnership outreach outcome

- **Observed action — 4 August 2026:** Mike sent one manual email to the England Athletics RunEvents organisational contact route proposing a short attributed referral pilot.
- **Offer tested:** RENM would feature a small selection of upcoming RunEvents races, use approved RunEvents branding and direct runners to official entry pages at no cost to England Athletics; the requested counterpart is a means to attribute completed entries.
- **Evidence boundary:** the email described early high-intent outbound traffic. It did not claim that RENM has measured registrations, revenue or incremental demand.
- **Outcome:** awaiting response. No individual organiser, Enthuse or Sport:80 outreach was sent.

The Cock Crow organiser email was not sent: the club secretary would be unlikely to control or observe the third-party booking funnel, so that approach could not test the commercial hypothesis. Keep `ORG-V-010` as a corporate portfolio comparator, `ORG-V-002` as historical destination evidence and `ORG-V-001` separate as a ballot/data-acquisition case. Addresses, named contacts, restriction notes and suppression evidence stay private.

## Public sources

- Adnams event page: https://adnams.co.uk/pages/adnams-10km-run
- Adnams PLC company record: https://find-and-update.company-information.service.gov.uk/company/00031114
- RunThrough terms: https://www.runthrough.co.uk/terms-and-conditions
- Newick Sports Pavilion Charitable Trust: https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/5145150/full-print
- Great Bentley Running Club race page: https://gbrc.org.uk/our-races/great-bentley-half-marathon/
- Cheltenham & County Harriers event page: https://www.cheltenhamharriers.co.uk/fixtures-events-results/evesham-velo-park-5k-series/
- ICO B2B marketing guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/
