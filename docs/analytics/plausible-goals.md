# Plausible Goals Checklist

Reference doc for registering every custom event the app fires as a **Goal** in the Plausible dashboard. Until a custom event is registered as a goal, it is tracked but does not appear in the Goals report and cannot be used in funnels or conversion filters.

Site in Plausible: `runningeventsnearme.com`. Bootstrap script and bot-guard live in `src/routes/__root.tsx`; the wrapper helper is `src/lib/analytics.ts`.

---

## 1. How to add a goal in Plausible

1. Plausible → **Site Settings** → **Goals**.
2. Click **+ Add Goal**.
3. Choose **Custom Event** (or **Pageview** for the two pageview goals below).
4. Paste the **exact** goal name from the table below (Title Case, spaces preserved).
5. Save. Repeat for each row.

For custom properties (step 3 below) go to **Site Settings → Custom Properties → + Add Property** and add the prop key (no value).

---

## 2. Goal registry

Every name here is the exact string passed to `window.plausible(name, …)`. Copy-paste it verbatim — Plausible matches on string equality.

### P0 — register now (conversion proxies)

| Goal name | Type | Fires from | Trigger | Props sent |
|---|---|---|---|---|
| `Entry Click` | Custom Event | `src/lib/analytics.ts` → `trackEntryClick` (called from event card / event detail CTAs) | User clicks an outbound entry / organiser link | `slug`, `region`, `link_type` (`entry` \| `organiser-site` \| `organiser-other`), `proximity` (`future` \| `today` \| `imminent` \| `past`), `event_name`, `distance`, `discipline`, `entry_domain` |
| `Form: Submission` | Custom Event | `src/routes/list-your-event.tsx:98`, `src/components/events/RaceReminderSignup.tsx:43`, `src/routes/running-clubs.$slug.claim.tsx:102` | Any of the three forms submits successfully | `form` (`list-your-event` \| `race-reminder` \| `club_claim`), `slug` (claim only) |
| `Search Result Click` | Custom Event | `src/lib/analytics.ts` → `trackSearchResultClick` | User clicks a result in the search UI | `query`, `slug`, `position`, `results_count` |
| `Club Website Click` | Custom Event | `src/routes/running-clubs.$slug.tsx:252` | User clicks the outbound club website link | `slug`, `region` |

### P1 — engagement / navigation

| Goal name | Type | Fires from | Trigger | Props sent |
|---|---|---|---|---|
| `Search Performed` | Custom Event | `src/routes/search.tsx:100` | Search executes | `query`, `results_count`, … |
| `Club Page View` | Custom Event | `src/routes/running-clubs.$slug.tsx:168` | Club page mounts | `slug`, `region`, `is_claimed`, `governing_body` |
| `Region View` | Custom Event | `src/lib/analytics.ts` → `trackRegionView` | Region landing page mounts | `region`, `distance`, `total_events` |
| `Location Set` | Custom Event | `src/lib/analytics.ts` → `trackLocationSet` | User sets their location | `method` (`device` \| `postcode`) |
| `Filter` | Custom Event | `src/lib/analytics.ts` → `trackFilter` | User changes a filter | `page`, `filter_type` (`radius` \| `distance` \| `month` \| `region`), `value` |
| `Claim Interest` | Custom Event | `src/lib/analytics.ts` → `trackClaimInterest` | User opens a claim CTA | `slug`, `region` |
| `Back to search clicked` | Custom Event | `src/components/site/BackToSearchBar.tsx:25` | User clicks Back to search | `q` |

---

## 3. Custom properties to register

Add each of these under **Site Settings → Custom Properties** so they become filterable in the dashboard and usable in breakdowns:

`link_type`, `proximity`, `entry_domain`, `event_name`, `slug`, `region`, `distance`, `discipline`, `form`, `method`, `filter_type`, `page`, `query`, `results_count`, `position`, `total_events`, `is_claimed`, `governing_body`, `q`.

Keep the list flat and stable — Plausible drops nested objects, and renaming a prop later loses history.

---

## 4. Funnels worth building

Plausible → **Funnels → + Create Funnel**. All three require the goals above to exist first.

1. **Search → Click → Entry**
   `Search Performed` → `Search Result Click` → `Entry Click`
   Measures whether the site actually gets people from a query to an outbound entry.

2. **Region browse → Entry**
   `Region View` → `Entry Click`
   Isolates conversion from the SEO landing pages vs. the search flow.

3. **List-your-event lead**
   Pageview `/list-your-event` → `Form: Submission` (filter `form=list-your-event`)
   Gives a real conversion rate on the organiser lead form.

---

## 5. Verifying goals fire

Pick any option:

- **Plausible Realtime** (top-right of dashboard) — trigger the action on the live site, watch the goal count tick up within ~10 s.
- **DevTools → Network** — filter for `plausible.io/api/event`. Each fire is a `POST` with a JSON body containing `n` (event name) and `p` (props). Confirm the name matches the registered goal exactly.
- **Console** — paste `window.plausible?.toString()` on production. If it returns `function(){}` the bot-guard in `__root.tsx` suppressed tracking (headless, `navigator.webdriver`, missing languages, or non-canonical host).

The bootstrap only initialises Plausible on `runningeventsnearme.com` / `www.runningeventsnearme.com`. Preview and localhost are intentionally silent — verify goals against the production domain only.

---

## 6. Gaps (follow-ups, not this PR)

- No `Event Page View` custom goal — event-detail pageviews are only in the raw pageview stream and can't be filtered by `slug` / `region` / `distance` for cohorting.
- No `Outbound: Club Directory` or `Outbound: Governing Body` event on directory-style pages.
- `Entry Click` fires from the shared helper, but coverage on every card variant (homepage carousel, "same weekend nearby", "other races by organiser") should be audited — see the related-events coverage audit script proposed alongside this doc.
