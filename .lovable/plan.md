## Goal

Add **Big Half** and **Vitality London 10,000** as ACTIVE manual events so `/$slug` redirects them internally to real pages (fixes GSC soft-404s + keeps users on-site).

## Changes

### 1. Insert two events (data-only)

| Field | Big Half | Vitality London 10,000 |
|---|---|---|
| `slug` | `big-half` | `vitality-london-10k` |
| `norm_id` | `manual:big-half` | `manual:vitality-london-10k` |
| `name` | The Big Half | Vitality London 10,000 |
| `date_from` / `date_to` / `sort_date` | 2026-09-06 | 2026-09-27 |
| `date_raw` | "Sunday 6 September 2026" | "Sunday 27 September 2026" |
| `distances` | `Half Marathon` | `10K` |
| `discipline` | `Road` | `Road` |
| `town` | London | London |
| `region` | London | London |
| `country` | England | England |
| `lat` / `lng` | 51.505456, -0.075357 (Tower Bridge) | 51.504490, -0.134307 (The Mall) |
| `organiser` | London Marathon Events | London Marathon Events |
| `organiser_url` | https://www.londonmarathonevents.co.uk/big-half | https://www.londonmarathonevents.co.uk/london-10000 |
| `entry_url` | same as organiser_url | same as organiser_url |
| `entry_fee` | **null** | **null** |
| `source` / `source_url` | `manual` / organiser_url | `manual` / organiser_url |
| `status` / `is_upcoming` / `date_is_estimated` | ACTIVE / true / false | ACTIVE / true / false |

**On entry_fee — deliberately null.** Per the scraped-data-trust core rule, we don't assert fees we haven't verified at-source today, and "typically £35–£55" / "typically £39" is exactly the kind of stale or approximate pricing that erodes trust if wrong on the day. Leaving null causes the event card to render "See event website for entry fee" and link out, which is the correct behaviour. (If you later confirm the live 2026 entry fee from the LME page, we can update — easy follow-up.)

**On lat/lng — included.** These are stable course start points, not pricing, so they're safe to record and they make the events appear on the radius map. Both fall inside the UK lat/lng bounding box used by the distance/region queries, so they'll show up on `/10k-races`, `/half-marathons`, `/running-events/london/10k`, etc.

### 2. Trim `LEGACY_EXTERNAL_REDIRECTS` in `src/routes/$slug.tsx`

With DB rows present, the existing flow handles both URLs:

`/big-half` → `lookupEventSlug` hits → 301 to `/events/big-half`
`/vitality-london-10k` → 301 to `/events/vitality-london-10k`

Remove the two entries from the external redirect map (leave the empty `Record<string,string>` scaffold for the next legacy case). No other code touched.

### 3. Verify after deploy

- Sitemap picks both slugs up automatically (driven by `getAllActiveSlugs`).
- Hit "Validate fix" in GSC for `/big-half` and `/vitality-london-10k` — both now return 200 via a single 301 to the canonical `/events/{slug}`.
- Spot-check the two event pages render with a working "Enter now" CTA pointing at londonmarathonevents.co.uk (the URLs are event-specific so `classifyEventLink` will treat them as enterable, not as a homepage).

## Out of scope

- Persisting the £35–£55 / £39 figures (intentional — see entry_fee note above).
- Reclassifying these as our own listings — they remain LME-owned; we just provide the landing page + clear hand-off.
