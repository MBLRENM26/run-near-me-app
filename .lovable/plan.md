
## Sprint A — wiring plan

Four workstreams, ordered by independence so they can ship in any order without blocking each other.

---

### 1. Title/meta rewrite (template-only)

Goal: lift the 0.7% CTR on 94k impressions by front-loading event name, distance, location, date in `<title>` and meta description across the high-traffic route templates.

Routes to update (all via `head()` in `createFileRoute`):
- `events.$slug.tsx` — `"{name} — {distance} in {town}, {county}, {date} | Running Events Near Me"` + matching description and `og:title`/`og:description`/`og:url`. Canonical self-references.
- `parkrun-events.$slug.tsx` — same pattern, locked to "5K parkrun" + weekly schedule.
- `running-events.$slug.tsx` + `running-events.$slug_.$distance.tsx` (region + region/distance hubs) — `"{Distance} races in {Region} — {count} upcoming events"`.
- `5k-races.tsx`, `10k-races.tsx`, `half-marathons.tsx`, `marathons.tsx`, `trail-running-events.tsx`, `ultra-marathons.tsx` — `"{Distance} races in the UK — {count} upcoming events"`.
- Home `index.tsx` — keep current but verify it leads with the value prop, not "Running Events Near Me — Find your next race".

Implementation rules (from `head-meta` knowledge):
- Title stays inside the `meta` array, never as a top-level field.
- Each leaf route owns its own `canonical` link; `__root.tsx` keeps only sitewide defaults.
- `og:url` self-references the route, built from `params` / loader data.
- No new DB columns. No admin override UI this sprint.

No data migration. No backfill. Pure code change in route `head()` functions.

---

### 2. Save-a-race email capture

Single email input on event detail pages: *"Get a reminder before entries close."* One row per user+event. No account required.

**Schema** (one migration, with grants + RLS per `cloud-db-workflow`):

```sql
CREATE TABLE public.email_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reminder',  -- future: 'digest', 'entries_open'
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at timestamptz,
  UNIQUE (email, event_id, kind)
);

GRANT SELECT, INSERT ON public.email_subscriptions TO anon;  -- public subscribe
GRANT ALL ON public.email_subscriptions TO service_role;
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
-- INSERT policy: anon can insert (server fn validates + rate-limits)
-- No SELECT policy for anon — reads only via service_role from server fns
```

**UI**:
- New `<RaceReminderSignup eventId slug name sortDate />` component, rendered on `events.$slug.tsx` and `parkrun-events.$slug.tsx` below the "About this race" block. Hidden when `sort_date` is null or in the past.
- One email field, one button, inline success/error state. Reuses existing `Input` + `Button`. Validation via `zod` (mirrors `list-your-event` pattern).
- Plausible event: `Form: Submission` with `{ form: 'race-reminder' }`.

**Server fn** — `src/lib/subscriptions.functions.ts`:
- `subscribeToRaceReminder({ email, eventId })` — zod-validated, idempotent on `(email, event_id, 'reminder')`, checks `suppressed_emails` before insert, returns `{ ok: true }`.
- No middleware (public endpoint), but rate-limit by IP later if abused.

**Email sending** — reuse existing Lovable transactional infra (`/lovable/email/transactional/send` + `email_send_log` + `suppressed_emails` + `email_unsubscribe_tokens`):
- New template `src/lib/email-templates/race-reminder.tsx` registered in `registry.ts`.
- Confirmation email sent immediately on subscribe ("You're signed up — we'll email you 7 days before {name}").
- Reminder cron — pg_cron job at 09:00 daily calling `/api/public/hooks/send-race-reminders` (anon-key auth per `schedule-jobs-options`), which selects `email_subscriptions` rows where `event.sort_date BETWEEN now()+6d AND now()+7d` AND `reminder_sent_at IS NULL`, enqueues one email per row via existing send route, marks `reminder_sent_at`.
- Footer unsubscribe link points at the existing `/email/unsubscribe` page (infra already issues per-email tokens; subscribe flow upserts into `email_unsubscribe_tokens` the same way `notify.server.ts` does).

**Not in scope this sprint** (explicitly deferred):
- Weekly nearby digest (needs region preference + content selection logic).
- Entries-open alerts for recurring events (needs recurring-event detection + state tracking).
- Account creation / user dashboard for managing subscriptions.

---

### 3. Plausible "Form: Submission" scope fix

Trivial. The `track('Form: Submission', ...)` call currently fires from any form with that wrapper. Restrict to the two real conversion events:
- `list-your-event.tsx` — keep (already correct).
- `running-clubs.$slug.claim.tsx` — keep.
- Any admin/search/internal form using the same track call — remove the call or rename the event to something non-funnel like `Admin Action`.

Audit step: `rg "Form: Submission"` in `src/`, confirm only the two public forms remain. Add the new `race-reminder` event from §2 with its own `form` value so it's distinguishable in Plausible.

---

### 4. Sitemap audit

Verify `src/routes/sitemap[.]xml.tsx` covers:
- All current static routes (home, distance hubs, region hubs, parkrun index, clubs index, about, privacy, list-your-event).
- Dynamic: `events`, `parkrun-events`, `clubs`, region+distance combinations.
- Status filter matches public reads — `status = 'ACTIVE'` only (so the 21 newly-HIDDEN events drop out automatically; confirm they do).
- Excludes admin routes, `/lovable/*`, `/api/*`, `/email/unsubscribe`.

Pre-flight for Sprint B (time-bucketed pages): note any structural gaps now (e.g. sitemap entries are flat — adding `/running-events/this-weekend` later will Just Work; no refactor needed).

Output: brief checklist in the closing message of what was already correct vs what got added.

---

## Suggested ship order within Sprint A

1. **Plausible scope fix** (10 min, no dependencies, immediately cleans funnel data for the rest of the sprint).
2. **Sitemap audit** (30 min, no dependencies).
3. **Title/meta rewrite** (1-2 hrs, no dependencies, immediately starts the CTR test clock).
4. **Save-a-race email capture** (rest of sprint — schema + UI + server fn + template + cron). Heaviest piece, ship last so it doesn't block the SEO wins.

## Sprint B preview (not building this sprint)

Time-bucketed landing pages — `/running-events/this-weekend`, `/running-events/next-weekend`, `/running-events/{YYYY}-{month}`. SSR routes with dynamic date ranges, self-referencing canonical, sitemap entries added in the same PR. Will reuse the `DistancePage` component shell with a date-filter loader.

## Technical notes (for reference)

- All server fns follow `tanstack-server-functions` chain shape (`.inputValidator().handler()`).
- Email infra is already scaffolded — no new `setup_email_infra` call needed. Just add the template + register it + add the cron route.
- Migration includes `GRANT` block per `public-schema-grants` rule.
- No new secrets needed (reuses `IMPORT_SECRET` pattern for the cron route, or the documented `apikey` pattern from `schedule-jobs-options`).
