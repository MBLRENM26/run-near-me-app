## Running Events Near Me — Build Plan

A UK location-first running event discovery app at runningeventsnearme.com. Core UX: "show me what's on near me." Clean, consumer-feel design with a single green accent.

### 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then create the `events` table via migration:

- `id` uuid PK (default `gen_random_uuid()`)
- `name`, `date_raw`, `town`, `county`, `region`, `distance_type`, `entry_fee`, `organiser`, `url` — text
- `latitude`, `longitude` — float8
- `is_featured` boolean default false
- `created_at` timestamptz default now()

Enable RLS with a public read policy (`SELECT` to `anon`/`authenticated`); no insert/update/delete policies for now (admin-only later). Seed ~10 sample UK events (London, Manchester, Edinburgh, Bristol, etc.) so the homepage isn't empty during development.

### 2. Design system

Update `src/styles.css` tokens:
- Accent green `--primary: oklch(...)` matching `#16a34a` (with a glow variant)
- Neutral whites/light greys for backgrounds, subtle border tones
- Inter font loaded via `<link>` in `__root.tsx` head
- Soft card shadow token (`--shadow-card`)

All components use semantic tokens — no hardcoded colours.

### 3. Routes & files

- `src/routes/index.tsx` — homepage (replace placeholder)
- `src/components/site/Header.tsx` — wordmark + tagline
- `src/components/site/Footer.tsx` — copyright + "List your event" link
- `src/components/events/LocationPrompt.tsx` — geolocation button + postcode input
- `src/components/events/FilterBar.tsx` — radius selector + event type chips (horizontally scrollable on mobile)
- `src/components/events/EventCard.tsx` — single event card
- `src/components/events/EventList.tsx` — grid/stack of cards
- `src/lib/distance.ts` — Haversine helper + event-type matcher
- `src/integrations/supabase/client.ts` — auto-generated when Cloud is enabled

### 4. Homepage behaviour

State (in `index.tsx`):
- `coords: { lat, lng } | null`
- `radius: 5 | 10 | 25 | 50` (default 10)
- `eventType: 'all' | '5k' | '10k' | 'half' | 'marathon' | 'trail' | 'ultra'`
- React Query fetch of all events from Supabase on mount

Flow:
1. Hero shows "Find running events near you" with two side-by-side options.
2. **Use my location** button — only on click calls `navigator.geolocation.getCurrentPosition`. Toast on denial/error.
3. **Postcode input** — on submit, fetches `https://api.postcodes.io/postcodes/{postcode}`, sets coords. Validation + error toast for invalid postcodes.
4. Once `coords` is set, the filter bar and results section render.
5. Events are mapped client-side: compute Haversine distance, filter by `radius` and `eventType` (matched against `distance_type` text), sort ascending by distance, render cards.
6. Empty state: "No events within X miles. Try a wider radius."

### 5. Event card

Shows: name (heading), date_raw, town + county, distance ("8.2 miles away"), event-type badge (derived from `distance_type`), entry_fee, "View event" button linking to `url` (target="_blank", rel="noopener"). Featured events get a subtle accent border/badge.

### 6. Responsive & SEO

- Mobile-first Tailwind; filter bar uses `overflow-x-auto` with no scrollbar; cards stack on mobile, 2-up on tablet, 3-up on desktop.
- `head()` on index route: title "Running Events Near Me — Find your next race", meta description, canonical, og tags. Single H1 in hero.

### Technical notes

- Postcodes.io is keyless and CORS-enabled — called directly from the browser, no server function needed.
- Distance/filtering done in the browser per spec; can migrate to PostGIS later.
- All Supabase reads go through the browser client (`@/integrations/supabase/client`) — no auth required for public events.
- Custom domain (runningeventsnearme.com) is connected after publish via Project Settings → Domains; not part of code.

### Out of scope (for later)

- Auth, "List your event" submission flow, admin dashboard, date filtering, PostGIS distance queries, event detail pages.
