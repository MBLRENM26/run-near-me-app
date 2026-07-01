## SEO & AI search fixes

Three findings from the last scan. Pace calculator suggestion parked.

### 1. Sitemap — add `/about`

`src/routes/sitemap[.]xml.tsx` lists home, list-your-event, privacy and the discovery hubs but misses `/about`. Add one entry (priority 0.5, monthly).

The other flagged routes (`/index.html`, `/search`, `/admin/login`, `/email/unsubscribe`) stay excluded — internal utility / admin / auth surfaces that shouldn't be indexed.

### 2. `/llms.txt` — add a proper Pages link list

Rewrite `public/llms.txt` to the spec format: keep the H1 + blockquote, then a single `## Pages` section as a markdown link list. Use the real flat slugs from `src/routes/` — no invented nested paths. Include:

- `/` — homepage
- `/about`
- `/list-your-event`
- `/5k-races`, `/10k-races`, `/half-marathons`, `/marathons`, `/ultra-marathons`, `/trail-running-events`
- `/road-races`, `/fell-races`, `/multi-terrain-races`
- `/running-events-this-weekend`, `/running-events-next-weekend` (flat routes — confirmed against `src/routes/running-events-this-weekend.tsx` and `running-events-next-weekend.tsx`, not `/running-events/this-weekend`)
- `/parkrun-events`, `/junior-parkrun-events`
- `/running-clubs`
- 1–2 representative region pages (e.g. `/running-events/london`, `/running-events/scotland`) rather than all 12
- `/privacy`

Exclude admin, `/auth`, `/email/*`, `/api/*`, `/lovable/*`, `/search`, per-event and per-club detail pages (thousands of rows — the hubs point crawlers into them).

Keep the short "What this site does" / "Who it is for" / "Data" paragraphs above the link list.

### 3. Accessibility contrast — audit muted text

The scanner flagged low-contrast text on the last **published** build, so the fix only clears after a republish. Approach:

- Grep for `text-muted-foreground/50`, `text-muted-foreground/60`, `text-gray-300`, `text-gray-400`, and any arbitrary `text-*/NN` opacity on light surfaces.
- Replace weakened muted tokens with plain `text-muted-foreground` (or `text-foreground` for body copy that needs to hit 4.5:1).
- Spot-check the header search placeholder, footer meta text, event-card metadata rows, and disabled chip pills — those are the usual offenders.

No token/theme changes — component-level pass only.

### Verification

After edits: view `/sitemap.xml` and `/llms.txt` in the preview to confirm the new entries render and every listed slug 200s. Contrast finding rescans against the published site — user will need to republish before it clears.

### Out of scope

Pace calculator (`/tools/pace-calculator`) — parked at user's request.
