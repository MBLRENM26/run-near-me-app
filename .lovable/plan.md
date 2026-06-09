# Event-page title, meta description & rich-results improvements

Goal: lift CTR on the ~10k monthly impressions sitting at positions 4–10 by making search snippets answer the searcher's question (date, location, how to enter) and maximising Event rich-result eligibility.

## 1. Title rewrite

Current: `EPIC Aylsham 5K 2026 | Norwich, Norfolk — Running Events Near Me` (often >60 chars, brand eats the visible tail).

New pattern, prioritised to fit ~60 visible characters:

- With a confirmed date: `{Name} {Year} — {Day Month}, {Town} | Entry & Info`
  e.g. `EPIC Aylsham 5K 2026 — 5 June, Norwich | Entry & Info`
- Estimated/month-only date: `{Name} {Year} — {Month}, {Town} | Entry & Info`
- Drop the county from the title (kept in description); drop the brand suffix from event-page titles — the domain already shows in the result.

## 2. Meta description rewrite

Current: `5 km race in Norwich, Norfolk on Friday 5 June 2026. Find details and enter online.`

New pattern (~150 chars), adding entry fee when known and a stronger close:

`{Name} is a {distance} race in {Town}, {County} on {Full date}. Entry {fee}. See route details, start time and enter online.`

- Omit the fee clause when blank/TBC/free (free → "Free entry.")
- For estimated dates: "expected {Month Year} — date to be confirmed."

## 3. Rich-results gaps in the Event JSON-LD

- **Fix invalid month-precision startDate**: for `date_is_estimated` events, emit a full ISO date (first of the month) and pair it with `"eventStatus": "EventScheduled"` only when confirmed — or simpler and safer: omit the JSON-LD block for estimated-date events so no invalid markup ships. (I'll use the omit approach — incorrect dates in rich results are worse than none.)
- **Add `offers`**: when `entry_url` exists, emit `offers: { "@type": "Offer", url, availability: InStock, priceCurrency: "GBP", price }`, parsing the numeric price from `entry_fee` (e.g. "£18" → 18). Skip `price` when unparseable; emit fee-free offers with just the URL.
- **Add `organizer.name` fallback**: when organiser name is missing, use the organiser site's hostname.

## 4. Cleanup

- Remove the dead `title` variable (lines 30–39 of the route file) left over from an earlier iteration.

## Technical details

- Single file change: `src/routes/events.$slug.tsx` (`head()` function only — no UI, loader, or schema changes).
- The same canonical/og tags stay; og:title/og:description follow the new copy.
- After deploy, validate one live URL with Google's Rich Results Test and request re-crawl is not needed — Google picks changes up on its normal recrawl cycle.
