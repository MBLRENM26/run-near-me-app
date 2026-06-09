# Next sprint: parkrun snippets, privacy top-up, and roadmap calls

## 1. Parkrun title/meta rewrite (build now)

Current title: `Comber parkrun — Free 5K Saturday 9:00am` — no location, no info cue, and weak for "[name] parkrun" searches (233 queries, ~1.5k impressions, near-zero clicks).

**New title pattern** (mirrors the event-page treatment):
- `{Name} — Free Weekly {5K|2K} in {Town} | Course & Start Time`
- e.g. `Comber parkrun — Free Weekly 5K in Comber | Course & Start Time`
- Drop town segment when unknown.

**New meta description** (~150 chars):
- `{Name} is a free, weekly, timed {5K|2K} in {Town}, every {Saturday 9:00am|Sunday 9:30am}. See the course map, nearby parkruns and how to register.`

**Data change needed:** the parkrun detail server function doesn't currently fetch `town`/`county` — add those two fields to its select so the title/description can include location. No schema change.

**JSON-LD:** keep the existing recurring-Event block; add `location.address` (town/county, GB) alongside the existing geo coordinates when available — addresses strengthen rich-result eligibility.

Files: `src/lib/parkrun.functions.ts` (detail fn select + type), `src/routes/parkrun-events.$slug.tsx` (`head()` only).

## 2. Privacy Policy — already live, small top-up (build now)

`/privacy` already exists with company details, data collected, retention, and UK GDPR rights. I'll add the missing GDPR-completeness pieces:
- **Lawful basis** for processing (legitimate interest / consent for form submissions)
- **Data processors / hosting** statement (data stored with our hosting and database providers within standard safeguards)
- **Right to complain to the ICO** with link
- Update "Last updated" date

## 3. GSC coverage export — waiting on you

Drop the CSV here when ready and I'll analyse indexing gaps (excluded URLs, crawled-not-indexed, duplicates).

## 4. Eventrac / Let's Do This outreach — yours

If useful, I can draft the two emails for you to review and send (positioning, API ask, partnership angle for Eventrac). Say the word.

## 5. List Your Event form improvements — needs scoping

Tell me what's bothering you about it (drop-off? missing fields? claim flow friction?) and I'll plan it.

## 6. "Near me" deprioritisation — my recommendation: agree

The query data is unambiguous: event-name + year queries dominate (7.3k impressions) vs ~122 for "near me". Recommend: keep the existing location prompt as-is (it's built, low maintenance), but stop investing in geo features and put that effort into event-page coverage, internal linking and the directory's long tail. No removal needed — just a roadmap call.

## What else I'd add

- **Measure the snippet rewrites** — check GSC CTR on the rewritten pages in ~3 weeks before further snippet work; that tells us if the pattern works before scaling it.
- **BreadcrumbList JSON-LD** on event + parkrun pages (Region → Event) — cheap, improves how the URL path displays in results.
- **Internal linking on event pages** — "More {distance} races in {county}" block; spreads authority to thin pages and helps crawl depth (relevant to whatever the GSC coverage export shows).
- **Sitemap freshness check** — confirm `sitemap.xml` includes all event + parkrun detail URLs with sensible lastmod, before reviewing the coverage CSV.
- **Terms of Use page** — you have privacy but no terms; worth having once organiser claims become a commercial relationship (Eventrac).

## Technical details

- Item 1: two files, head/meta only — no UI changes. Detail server fn gains `town, county` in its select.
- Item 2: content-only edit to `src/routes/privacy.tsx`.
- Both ship together; validate one parkrun URL in Rich Results Test after publish.
