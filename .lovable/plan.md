## Urgent admin tooling fix: create an event manually

You're not missing anything: `/admin/events` currently has no **New event** button. Event creation exists only through the structured-submission shortcut, so legacy free-text submissions like Ross River fall through a workflow gap.

## Build plan

1. **Add a server function to create admin events**
   - Add `createAdminEvent` alongside the existing admin event functions.
   - Require the existing admin session check.
   - Insert a draft/non-public event first, so nothing publishes accidentally.
   - Generate a unique slug from the name, with suffix fallback if needed.

2. **Add `/admin/events/new` route**
   - Reuse the existing admin shell.
   - Provide a compact manual event form with the fields needed for Ross River:
     - name
     - date display / sort date
     - town, county, region
     - distances / distance type
     - venue/address/postcode
     - entry URL / organiser URL
     - organiser
     - description
   - Save creates the event, then redirects to `/admin/events/$id` for the full editor.

3. **Add a “New event” button to `/admin/events`**
   - Put it in the header next to existing tools like duplicates/date enrichment.
   - Link to `/admin/events/new`.

4. **Improve legacy submission guidance**
   - Update the legacy free-text message in `/admin/claims` to link directly to `/admin/events/new`, not just `/admin/events`.
   - Keep the broader “link back submission automatically” helper out of scope for now to save credits.

## What this fixes

- You can manually create Ross River from the admin UI today.
- Future legacy/free-text submissions have a clear path.
- Structured submissions still keep the existing “Create event from submission” shortcut.

## Out of scope for this small fix

- Auto-linking a manually created event back to a legacy submission.
- Full Phase 2 taxonomy surfacing.
- Audience value pages.

Approve this and I’ll implement the small admin creation flow.