# Make every event link trustworthy, site-wide

## The diagnosis
Each issue you found is a category, not a one-off:

| Problem | Example | Affected |
|---|---|---|
| Entry URL missing `https://` → resolves as a dead page on our own site | Run Bournemouth 2026 | 110 events |
| Aggregator page (runabc etc.) presented as entry/attribution link | Full Essex Way Ultra | 658 events |
| Bare organiser homepage labelled "Enter now" | Dorney Lake Series 2 | 506 events |
| Guessed "date TBC" listings, all backed only by aggregator links | many | 978 events |

## The fix: a single link-trust policy

### 1. One shared rule set (`src/lib/link-trust.ts`)
Every URL shown anywhere on the site passes through one classifier:

- **Repair**: URLs missing a protocol get `https://` prepended (kills the dead-page bug instantly).
- **Aggregator hosts** (runabc.co.uk, runabc.scot, timeoutdoors, findarace, letsdothis, runningcalendar, England Athletics search pages): **never shown as a link anywhere** — not as "Enter now", not as "Visit organiser", not in the "Listed on…" attribution, not in JSON-LD. The attribution becomes plain unlinked text ("Listed via runabc") or disappears entirely, and the "Claim this listing" block takes over.
- **Organiser homepage** (domain root, no path): shown as **"Visit organiser website"** — never "Enter now". We only say "Enter now" when the link goes to an event-specific page.
- **Event-specific official page**: keeps the full "Enter now" treatment + JSON-LD offers.

Applied to the event detail page, meta descriptions ("…how to enter on the official site" only when a real official link exists) and structured data.

### 2. Data repair pass (one-off, reversible)
- Prepend `https://` to the 110 protocol-less URLs.
- No destructive changes to aggregator URLs — they stay in the database for future enrichment but the code never renders them as links.

### 3. Date-TBC listings (978)
These are old-scrape guesses with aggregator-only links. Under the new policy they'll honestly show: clear "Date to be confirmed — check the organiser's website" treatment, no fake entry link, and the Claim CTA. Additionally:
- Retire the ~551 whose guessed month has already passed (zombie listings) — marked `EXPIRED`, dropped from all listings and the sitemap, page returns not-found.
- The rest stay, clearly labelled and sorted after confirmed-date events (already the case in listings).

### 4. Verification
- Re-check Run Bournemouth 2026 (working external link), Full Essex Way (no runabc link, claim block), Dorney Lake Series 2 ("Visit organiser website" label).
- Site-wide query confirming zero active events can render an aggregator URL as a CTA.

## Technical details
- New `src/lib/link-trust.ts`: `classifyEventLink(url)` → `{ kind: 'entry' | 'organiser-site' | 'untrusted' | 'invalid', href }`; replaces `isGenericListingUrl` in `src/routes/events.$slug.tsx` and is used by `EventCard` if any external URL ever renders there.
- Data passes via SQL: protocol fix (`UPDATE … SET entry_url = 'https://' || entry_url WHERE entry_url !~* '^https?://'`, same for organiser_url/source_url) and the expired-TBC retirement.
- Sitemap and all listing queries already filter on `status = 'ACTIVE'`, so retired TBC rows drop out automatically.

## What this doesn't fix
The underlying scrape will keep producing aggregator links and guessed dates. The policy ensures we never *present* untrusted data as fact — the long-term fix is organiser-claimed listings (the Claim flow) and a better ingest pipeline, which we can plan separately.
