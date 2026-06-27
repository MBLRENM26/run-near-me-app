## Scope

Expand the green action band on `/events/$slug` to surface up to two distinct outbound links — a primary CTA (button) and a secondary text link — derived from the existing `entry_url` and `organiser_url` fields. No schema changes.

## Link derivation (`src/routes/events.$slug.tsx`)

Replace the current `primaryCta` block with a small `buildEventCtas(e, isPast)` helper (colocated in `src/lib/event-internal-links.ts` or a new `src/lib/event-ctas.ts` — leaning toward the latter to keep `event-internal-links.ts` focused on hub links).

Helper returns `{ primary, secondary } | null`. Logic:

1. Classify both URLs via `classifyEventLink` and drop anything that isn't `entry` or `organiser-site` (untrusted aggregators stay invisible — existing policy).
2. Walk both trusted links in priority order: `entryLink` first, then `orgLink`. The first one becomes `primary`; the second becomes `secondary` only if its **host differs** from the primary's host (avoids "Enter now → almostathletes.co.uk" + "Race website → almostathletes.co.uk").
3. Past events: still return `null` (current behaviour preserved).
4. Label rules (drive both primary and secondary off `isEntryPlatformHost(link.host)`):
   - Entry platform host → `"Book your place"`
   - Non-entry-platform, kind = `entry` → `"Enter now"` (or `"View event details"` when `proximity` is set, matching current imminent/today behaviour)
   - Non-entry-platform, kind = `organiser-site` → `"Race website"` (renamed from "Visit organiser website" — shorter, more inviting, matches user's spec)
5. `linkType` for analytics stays the same mapping it has today (`entry` / `organiser-site` / `organiser-other`) so Plausible breakdowns don't break.

## Rendering (same file, CTA block ~line 572-606)

Inside the existing tinted band:

- **Primary**: unchanged button styles. Label + `linkType` come from `primary`. Tracking call unchanged (still `trackEntryClick`, still fire-and-forget).
- **Secondary** (only when `secondary` exists): a small inline link below the button, above `proximityNote`:
  ```
  Race website: almostathletes.co.uk ↗
  ```
  Styled: `mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground`, with a small `ExternalLink` icon. The label prefix mirrors the rule set (`"Race website"` / `"Enter now"` / `"Book your place"`) so the user sees what kind of page they're going to. The hostname (`link.host`, already `www.`-stripped) is the visible URL hint.
- Secondary click fires `trackEntryClick` with its own `linkType` and `entry_domain` — gives us a clean per-link CTR read once it ships.
- `proximityNote` stays last inside the band.

## Past events

Past-event block (line 608-637) unchanged in scope, but it currently uses the bespoke `pastOrganiserLink` derivation. Quick alignment: have it call the same helper with a `past: true` flag that returns the trusted organiser link as a secondary-style item — keeps phrasing consistent ("Race website") across past + future. If that turns into more than a 10-line change, leave past events alone in this pass and note as follow-up.

## Non-goals (explicit)

- No new DB columns, no admin UI changes, no migrations. JSON column / `event_links` table is a follow-up once Eventrac or admin enrichment produces a third link.
- No chip row, no "Other ways to enter" header — visually overkill at max 2 links.
- No change to `RaceReminderSignup`, hero, breadcrumb, or surrounding layout.
- No change to `hasOrganiserOwnedLink` or discovery-surface filtering — those rules are independent of how the event page renders its CTAs.

## Analytics

Plausible goals untouched. The existing `Entry Click` goal already carries `link_type` + `entry_domain`, so a secondary click is just another row in the same goal — no dashboard work required to start measuring secondary CTR.

## Verification

- `bun run build` for typecheck.
- Playwright screenshot of three event states on desktop: (a) entry_url = booking platform + organiser_url = different-domain organiser site (both links render), (b) entry_url = organiser-owned entry page only (one button, no secondary), (c) past event (unchanged block). Confirm the secondary link is visually subordinate and the band still reads as one action zone.

## Technical notes

- `isEntryPlatformHost` already exists in `src/lib/link-trust.ts` and is exported. No changes to link-trust.
- `classifyEventLink` returns `host` with `www.` stripped, so the visible hostname needs no extra normalisation.
- The "different host" dedupe is a string compare on `link.host` — cheap, no URL parsing in the component.
- Helper lives in `src/lib/` (client-safe), no server function involved — pure data shaping.
