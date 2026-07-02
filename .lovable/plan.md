## Plausible Goals Checklist (docs-only PR)

Goal: get conversion data flowing in Plausible by registering every custom event the app already fires. No code changes — this is a reference doc so you can tick goals off in the Plausible dashboard and know exactly which code path fires each one.

### Deliverable

One new file: `docs/analytics/plausible-goals.md`

### Structure

1. **How to add a goal in Plausible** — 4-step instructions (Site Settings → Goals → + Add Goal → Custom Event → paste name → Save).
2. **Goal registry table** — one row per event name, columns:
   - Goal name (exact string, Title Case)
   - Type (Custom Event / Pageview)
   - Fires from (file + line)
   - Trigger (what the user does)
   - Props sent (name + example value)
   - Priority (P0 = register now, P1 = nice-to-have)
3. **Suggested Plausible custom properties to enable** — the props Plausible needs registered separately to appear as filters (e.g. `link_type`, `proximity`, `entry_domain`, `region`, `distance`, `discipline`, `form`, `method`, `filter_type`).
4. **Funnel suggestions** — 2-3 pre-built funnels worth setting up (Search → Search Result Click → Entry Click; Region View → Entry Click; List-Your-Event pageview → Form: Submission).
5. **Verification steps** — how to test each goal fires (DevTools → Network → filter `plausible.io/api/event`; or Plausible's realtime view).

### Events to register (from grep of `track(` and `trackX` helpers)

P0 — revenue/conversion proxies:
- `Entry Click` (src/lib/analytics.ts → trackEntryClick) — outbound to organiser/entry
- `Form: Submission` (list-your-event, race-reminder, club claim) — one goal, filter by `form` prop
- `Search Result Click`
- `Club Website Click` (running-clubs.$slug.tsx:252)

P1 — engagement/navigation:
- `Search Performed`
- `Club Page View`
- `Region View`
- `Location Set`
- `Filter`
- `Claim Interest`
- `Back to search clicked`

### Out of scope

- No new tracked events, no code edits, no dashboard automation.
- Any missing goals we spot while writing the doc get logged in a "Gaps" section at the bottom for a follow-up PR — not added now.

### Follow-ups (not this PR)

- Related-events coverage audit script (option b from the previous message).
- Adding `Entry Click` funnel to the /events/$slug template if we find it's under-firing.
