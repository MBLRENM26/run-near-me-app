# Plausible analytics — goals & props

All custom events go through `src/lib/analytics.ts → track()`. The Plausible
script is only loaded on the production hostnames (`runningeventsnearme.com`,
`www.runningeventsnearme.com`) via the guard in `src/routes/__root.tsx`, so
nothing fires on preview / dev / localhost. That guard is intentional — do
not remove it without also setting `data-exclude` paths in the Plausible
config.

To make any of these show up in the **Goals** tab of the Plausible
dashboard, each goal below has to be added once as a *Custom Event Goal*
with exactly the name in column 1. Props become filterable automatically
once the goal has been added and an event has fired.

## Goals

| Goal name | Fired from | Props |
|---|---|---|
| `Entry Click` | Primary CTA on `/events/$slug`; past-event "Visit organiser website" link in the same route | `slug`, `region`, `link_type` (`entry` \| `organiser-site` \| `organiser-other`), `proximity` (`future` \| `today` \| `imminent` \| `past`), `event_name`, `distance`, `discipline`, `entry_domain` (hostname of outbound URL, `www.` stripped; omitted when the URL is unparseable — register under Plausible → Site Settings → Custom Properties to make it filterable) |
| `Club Website Click` | Club page CTA (`/running-clubs/$slug`) | `slug`, `host`, `kind` (link-trust kind) |
| `Club Page View` | Club page mount | `slug`, `region`, `is_claimed`, `governing_body` |
| `Claim Interest` | "Claim this event" CTA on `/events/$slug` | `slug`, `region` |
| `Region View` | `/running-events/$slug` region listing mount | `region`, `total_events`, `distance` (optional) |
| `Filter` | Radius / distance / month chips on home, region, distance pages | `page`, `filter_type` (`radius` \| `distance` \| `month` \| `region`), `value` |
| `Location Set` | Postcode lookup / device geolocation prompt | `method` (`device` \| `postcode`) |
| `Search Performed` | `/search` after a non-postcode query resolves | `query`, `results_count`, `has_results` |
| `Search Result Click` | Click on a result row on `/search` | `query`, `slug`, `position`, `results_count` |
| `Form: Submission` | List-your-event form + club claim form submit | `form` (`list-your-event` \| `club_claim`), `slug` (claim only) |

## Conversion model

The runner-conversion funnel is:

```text
pageview (/events/<slug>)  →  Entry Click (link_type = "entry")
```

Both events carry `slug` (Entry Click as a prop, pageview as the URL), so
once `Entry Click` is registered as a goal you can break conversion rate
down per event in Plausible. Filter on `link_type=entry` for the strictest
read of "this runner went to enter a race"; include `organiser-site` /
`organiser-other` for the looser "intent" funnel.

Search funnel:

```text
pageview (/search?q=...)  →  Search Performed  →  Search Result Click  →  Entry Click
```

`Search Result Click` and `Search Performed` share `query` + `results_count`,
so search→click CTR is one filtered chart in Plausible.

## Rules to keep this honest

- **Never add tracking to internal `<Link>` navigation** — pageviews already
  cover that. Custom events are reserved for *outbound clicks*, form
  submissions, and explicit UI intents (filter chips, location prompts).
- **Outbound link tracking must never block navigation.** Use synchronous
  `onClick` only; never `await` the call. The `track()` helper is
  fire-and-forget and tolerant of `window.plausible` being undefined.
- **Prop values stay shallow primitives.** Plausible drops nested objects
  and large arrays silently — keep them strings/numbers/booleans.
- **Goal names are Title Case.** Match the table above verbatim when
  adding a goal in the Plausible dashboard.
- **Don't put PII in props.** No email, no IP, no full postcode (the
  `Location Set` event records the *method*, not the value).
