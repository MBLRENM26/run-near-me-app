# RENM — Urgent subscriber/reminder incident audit

Status: read-only investigation. No implementation, messaging or data correction is authorised.

## Incident

On 29 July 2026 Mike discovered that expected subscriber notifications and admin visibility had been absent. A quick admin interface then exposed 23 distinct stored reminder rows across 17 events, dated 25 June–29 July. One uses Mike's controlled address; 22 appear external across 16 events. All displayed `Reminder sent` values are blank.

## Objective

Determine whether submissions were received, stored, confirmed, notified, delivered, suppressed, duplicated or orphaned, and whether the admin-login/general-maintenance fixes affected their visibility. Preserve all evidence and personal data in place.

Known current-system statement from Mike: no scheduled reminder sender was implemented. Delivery was intentionally parked until demand was demonstrated. Do not report the absence of scheduled sends as an unexplained scheduler failure. Verify that no scheduled path exists or is active, and focus the audit on capture, acknowledgement, consent, admin visibility and the treatment required for existing promises.

Also identify and assess the newly added admin interface and its exact commit/query/access boundary. Its existence confirms database visibility through at least one path; it does not prove consent, confirmation, delivery or appropriate admin security.

## Controlled live-test evidence — 29 July 2026

Mike submitted the Rockingham Chase reminder form using his controlled address. The public UI promised an email approximately one week before the event so the runner would not miss entries closing, described the flow as one email with unsubscribe at any time, and displayed a success toast directing the user to check the inbox for confirmation.

An immediate RENM acknowledgement email was delivered. It confirmed that the address was on the list, repeated the event date/location and linked to the listing. The supplied content showed no confirmation action and no visible unsubscribe link. The subscription was accepted on the same displayed date as the event, after the nominal one-week-before reminder point.

Reconcile separately:

- submission stored;
- immediate acknowledgement attempted/accepted/delivered;
- confirmation required/confirmed;
- future reminder eligible/scheduled/attempted/delivered;
- unsubscribe offered/used/suppressed.

Do not use one boolean `Reminder sent` to collapse these stages. Determine whether the historic rows received immediate acknowledgements, and whether any notification/provider evidence exists even though the admin column is blank.

## Absolute restrictions

- Do not display or return full email addresses; use redacted values or internal IDs.
- Do not send confirmation, reminder, notification or test emails to real subscribers.
- Do not manually create, update, confirm, suppress or delete subscriber records.
- Do not change RLS, authentication, admin queries, functions, provider configuration, secrets, jobs, code, schema or production data.
- Do not export the address list.

## Read-only reconciliation

Trace the complete path from the public form through client validation, network request, edge/server function, database insert/upsert, consent/confirmation token, email provider, notification mechanism and admin query/view.

For every apparent submission, return a redacted matrix containing:

- internal record/provider identifiers;
- submission timestamp and occurrence/event identifier where present;
- database presence and table/view;
- consent state;
- confirmation state and timestamp;
- provider acceptance/delivery/suppression state;
- admin eligibility/filter reason;
- notification state;
- duplicate/orphan/conflict indication;
- evidence source and confidence.

Also report:

1. The number of unique apparent submissions and duplicates.
2. Whether the public interface showed success when persistence failed.
3. Whether records exist but are hidden by RLS, admin authentication, query filters, schema drift or date/status conditions.
4. Whether emails were sent without durable consent/subscription records.
5. Whether durable records exist but notifications failed.
6. Whether recent admin-login or maintenance changes altered access, queries or visibility.
7. The earliest and latest affected timestamps and whether the incident is ongoing.
8. Evidence-preserving containment options, smallest repair packages and rollback for later approval.

Separate confirmed evidence from inference. Stop after the report; implement nothing.
