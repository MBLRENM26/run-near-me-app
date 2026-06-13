# Replace event FAQ with site-trust module + dedicated /about page

## Why

The current per-event FAQ restates fields already visible above the fold (date, location, distance, entry). It reads as SEO padding, not trust-building. Pivot to site-level Q&A that explains who we are, where data comes from, and how to correct it — surfaced briefly on every event page and in full on a dedicated page.

## What changes

### 1. New file: `src/lib/site-faqs.ts`
Single source of truth for the 8 site-level Q&A. Plain constants, no per-event logic. Each entry: `{ id, q, a }`. Answers use the copy you supplied verbatim, with one wording tweak:

- Event-page Q2 becomes **"Can I enter races through Running Events Near Me?"** (answer still clarifies we don't process entries or payments, and links out to the event/entry page when one is available).

### 2. New route: `src/routes/about.tsx` → `/about`
- Renders all 8 Qs as an accordion.
- `head()`: title "About — Running Events Near Me", description, canonical, og:*.
- Emits `FAQPage` JSON-LD with all 8 Qs (this is the only page that emits FAQPage schema).
- Linked from the site footer.

### 3. Event page: `src/routes/events.$slug.tsx`
- Remove the existing per-event FAQ block + its JSON-LD.
- Add a new "About this listing" accordion **below** the "More races in {region}" / related-events section.
- Renders exactly 3 fixed Qs from `site-faqs.ts`:
  1. Is Running Events Near Me the organiser of these races?
  2. Can I enter races through Running Events Near Me?
  3. How can I update or correct a race listing?
- Conditionally renders a 4th Q ("Why is some race information missing?") **when the listing has no trusted entry or organiser link**. "No trusted link" means: for both `entry_url` and `organiser_url`, the URL is missing/null OR `classifyEventLink` returns anything other than `entry` or `organiser-site` (i.e. untrusted, aggregator, invalid all count as absent).
- Footer link under the accordion: "See all FAQs →" to `/about`.
- **No FAQPage JSON-LD on event pages** — the trust module is site-level content, not event-specific FAQ content. Keep schema where it semantically belongs (the `/about` page).
- The proximity banner ("Race day is today/near…") stays — unrelated to the FAQ block.

### 4. Cleanup in `src/lib/event-description.ts`
Delete now-unused exports and helpers:
- `buildEventFaqs`, `EventFaqInput`, `EventFaq`
- `hasRealDistance`, `distancesAlreadyInName`

Keep: `buildAboutParagraph`, `distanceSingular`/`Plural`, `formatListingAdded`, `listingPublishedISO`. Keep `eventProximity` in `src/lib/date.ts` (banner still uses it).

### 5. Footer
Add an "About" link in `src/components/site/Footer.tsx` routing to `/about`, alongside the existing Privacy / List your event links.

## Answer copy

Q1–Q8 use the wording you supplied, with the one Q2 tweak above. Q3 (update/correct) and Q7 (list your race) answers both point to `/list-your-event`.

## Out of scope

- No DB changes, no scraper changes, no admin changes.
- No changes to event card, header, or other listing pages.
- No new "weak listing" badge — the 4th Q is the only surfacing of that state.

## Verification

- `/about` renders 8 Qs and a single valid FAQPage JSON-LD block covering all 8.
- Event page with a trusted `entry_url` (e.g. Vitality London 10,000): module shows 3 Qs, no 4th.
- Event page where both `entry_url` and `organiser_url` are null or untrusted (e.g. Rat Race Sea to Summit if untrusted): module shows 4 Qs including "Why is some race information missing?".
- Event page source contains no `application/ld+json` of `@type: FAQPage`.
- Accordion sits below the related-races section, above the listing-added footer line.
- Footer shows an "About" link routing to `/about`.

## Reversibility note

Per-event FAQ logic is isolated to `event-description.ts` + the JSX block in `events.$slug.tsx`. Deleting it removes ~80 lines and 2 helpers, no other consumers. The pivot adds one constants file, one route, and one accordion block — strictly less complexity than what's there today.
