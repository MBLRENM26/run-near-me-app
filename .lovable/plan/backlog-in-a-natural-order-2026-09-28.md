# Backlog, in a natural order

The order: keep the pipes healthy first, then publish what's finished, then build the change-feed, then growth. Each step is approved on its own.

## 1. Finish stabilising (days)
- **Publish** so the daily failure-alert email and the fixed jobs run on the live site. The featured-card photo work goes out in the same publish.
- **Watch next Monday's automatic imports** (England and Scottish Athletics) to confirm they run with nobody touching them.
- **Review the older "security definer" database view** that the security check flagged.

## 2. Race change-feed from your homelab (1–2 weeks). This is the plan you asked for.
- Your homelab checks each race's official page. It checks weekly, and more often as race day gets closer.
- It sends only changes: the date, the entry link, entries open or closed, cancelled or postponed. Each change comes with the page it came from and the time it was checked.
- The site gets one secure entry point that accepts these change reports. They go into a **review queue**, not straight onto race pages.
- An admin screen shows each change: accept, reject, or mark as unknown. Accepted changes update the race and keep a record of what changed and why.
- Stop at the **review queue** at first: no automatic acceptance, and no new sources beyond the race websites we already hold.

## 3. Google recovery (after step 2 is running)
- **2027 editions of annual races**: use the recurrence tools to create next-year pages for the rising searches, for example Stubbington 10k, Great Bentley Half and Alloa Half. Dates stay "TBC" until confirmed.
- **Course depth**: extend the North Downs style course page to a few more races where we have permission.

## 4. Data quality (ongoing, small batches)
- **Organiser review**: work through the 108 "TBC" and 10 "Unknown" organisers one at a time with the tools we already have.
- **Scottish Athletics**: find the club websites for Scottish races whose only link is the booking site, so those races can appear in listings again.
- **Tidy the 233 old hidden race records** into their correct states.

## 5. Later, gated on evidence
- **Race photos beyond featured cards**, only with photos supplied by organisers.
- **Reminder emails**: stay switched off until the agreed runner test (10 repeat runners) is met and you approve it separately.
- **Explorer**: decide whether to link it publicly.

## Parked
Power of 10 results links, the organiser portal, Kent and South London data, and bulk SEO pages.

## Technical details (step 2)
- New tables: `source_change_reports` (event_id, field, old/new value, source_url, observed_at, reporter, status). Add grants and access rules so only admins can read or write them.
- Endpoint `POST /api/public/ingest/change-report`, secured with a shared HMAC signature (a secret key your homelab and the site both hold). Checks every report's format and limits how many can be sent.
- Admin page `/admin/change-reports`. Accepting a change writes a record to `event_edits`. Nothing is written to `events.source` on the public pages.
- The homelab gets a list of race pages to check from an export that only admins can reach, with the race id, official URL and date.
- Rollback: turn off the endpoint secret. The review queue changes nothing unless an admin accepts a change.
