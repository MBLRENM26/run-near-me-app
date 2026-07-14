## What's outstanding

After today's B5 discovery-gate ship, here's what's left, ranked by ROI:

### 1. C — Audience value pages (next up)

Three new routes answering "why use this site" per audience:
- `/for-runners` — provenance, trust signals, filters, onward routes
- `/for-clubs` — free listing, claim your page, member race feeds
- `/for-organisers` — free listing, structured submission, governance visibility

Own copy, own head metadata per route, linked from footer + header. I'll draft all three intros/FAQs in-chat for your review **before** writing files (same workflow as WA / NI / SA landing pages).

### 2. Same-weekend-nearby threshold fix (small, high-leverage)

Per the top-events audit: the "Same weekend nearby" block renders on only ~10% of top event pages because the county-scoped query rarely hits the ≥3 threshold. Fix: fall back to region when county returns <3. Regions have ~10× the density. Pure logic change in `src/lib/events.functions.ts`, small and safe.

### 3. Analytics — decision layer (not tracking)

Correction to what I said earlier — that was sloppy wording. The Plausible **goals are firing**: `Entry Click`, `Search Performed`, `Search Result Click`, `Form: Submission`, `Club Page View`, `Region View`, `Filter`, `Location Set`, `Claim Interest`, `Club Website Click`, `Back to search clicked` all track live in production, and the two funnels you registered today (Search Performed, Organiser Acquisition) are consuming them.

What's missing is the **decision layer on top** — nothing turns that data into a recurring read. Options, cheapest first:

- **a. Weekly digest doc** — I write `docs/analytics/weekly-read.md`: a fixed template of 6–8 questions to answer every Friday from Plausible (top zero-result queries, filter → Entry Click conversion, worst-performing region page, submission-form drop-off, etc.). You fill in ~10 min/week. Zero code, forces the habit.
- **b. Admin analytics page** — `/admin/analytics` reads Plausible's Stats API (needs a Plausible API key secret) and renders the same read live. Bigger job; only worth it if (a) becomes a habit.
- **c. Nothing** — leave Plausible as-is and check it when curious.

Recommend **(a)** now, revisit **(b)** later.

### 4. Scottish Athletics organiser URL enrichment (backlog)

Per `mem://backlog/scottish-athletics-organiser-urls`: 96 of 98 SA upcoming events still vanish from discovery even after today's B5 gate, because their only link is `scottishathletics.justgo.com/…` and no host-club website is captured. Needs a sync-side scrape of the host club's own site. Bigger job — flag for later, not this session.

### Recommendation

1. Ship **C (audience pages)** this turn — direct answer to your original ask; draft copy for review first.
2. Follow-on: **same-weekend threshold fix** (small).
3. Then **(3a) weekly analytics digest doc** — zero code, sets up the habit before considering a dashboard.

Shall I proceed with C and draft the copy for your review?
