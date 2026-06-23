## What's currently tracked

All custom events go through `src/lib/analytics.ts → track()` (Plausible). The script is gated to production domain in `src/routes/__root.tsx`, so nothing fires on previews/localhost.

| Goal name | Where it fires | Props |
|---|---|---|
| `Entry Click` | Primary CTA on `events/$slug` only | slug, region, link_type (`entry` / `organiser-site` / `organiser-other`), proximity, event_name, distance, discipline |
| `Club Website Click` | Club page CTA | slug, host, kind |
| `Club Page View` | Club page mount | slug, region, is_claimed, governing_body |
| `Claim Interest` | Claim CTA on events | slug, region |
| `Region View` | Region listings | region, total_events |
| `Filter` | Radius / distance / month chips | page, filter_type, value |
| `Location Set` | Postcode / device prompt | method |
| `Search Performed` | `/search` submit | (search) |
| `Form: Submission` | List-your-event & club claim | form |

Card clicks in listings (`EventCard`) are internal `<Link>`s — no external link tracking is needed there.

## What this means for "runner conversion"

The closest thing to a runner conversion is **`Entry Click`** with `link_type = "entry"`. The wiring is correct:

- `link_type` is set from `classifyEventLink(e.entry_url|organiser_url)` so it cleanly splits real entry pages from organiser homepages, matching the link-trust policy.
- `proximity` distinguishes `future` / `today` / `imminent` / `past` clicks.
- `region`, `distance`, `discipline` let you slice by audience.

So if Plausible's "Goals" tab looks empty, it isn't a tracking-code bug — it's that Plausible only counts an event as a **conversion** once you've added it as a Custom Event Goal in the dashboard. None of these goals exist there yet (that's a manual one-off in Plausible UI).

## Gaps worth fixing

1. **Past-event organiser link is untracked.** The "Visit organiser website" link inside the `isPast` block (`events/$slug` ~L488–500) has no `onClick`. Today these clicks are invisible. Fire `Entry Click` with `link_type = "organiser-site"`, `proximity = "past"` so they roll up alongside live conversions.
2. **`proximity ?? "future"` fallback is misleading.** `eventProximity(e)` always returns one of the four values, but the `??` makes a past CTA potentially report as `future` if the value were ever falsy. Pass `proximity` directly (typed) — small correctness tidy.
3. **No `Pageview` → `Entry Click` funnel breakdown exposed.** Once goals are registered in Plausible, the same `slug` prop is already on both `pageview` (URL) and `Entry Click`, so a per-event conversion rate is available — no code change needed, just dashboard setup.
4. **Optional polish:** `Search Performed` doesn't currently include the query or result count in the snippet I read — confirm before next iteration whether you want CTR-style funnel data from search.

## Recommended next steps (need your call before I touch anything)

- **A.** Add tracking to the past-event organiser link + drop the `?? "future"` fallback. ~5 lines in `src/routes/events.$slug.tsx`. Low risk.
- **B.** Same as A, plus a one-page README at `.lovable/analytics.md` listing every goal + props so the Plausible dashboard can be set up to match. No runtime impact.
- **C.** Leave code untouched; I write up exactly which goals to add in Plausible's UI and you do it there.

Tell me A / B / C (or another combination) and whether you want the search-funnel work (#4) folded in.