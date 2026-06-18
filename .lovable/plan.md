Three small, self-contained additions. None touch business logic, none require schema changes, each independently shippable.

## 1. Social links

**`src/lib/site.ts`** — add a typed `SOCIALS` array:

```ts
export const SOCIALS = [
  { label: "Instagram", handle: "@runningeventsnearme", href: "https://instagram.com/runningeventsnearme" },
  { label: "TikTok",    handle: "@runningeventsnearme", href: "https://tiktok.com/@runningeventsnearme" },
  // X + LinkedIn added once handles are registered
] as const;
```

**`src/components/site/Footer.tsx`** — small icon row sourced from `SOCIALS`. lucide-react `Instagram` already available; TikTok via a small inline SVG (lucide doesn't ship one). Icons `aria-label`'d, open in new tab with `rel="noopener noreferrer"`, `h-5 w-5`, muted → primary on hover.

**`src/routes/__root.tsx`** — extend the existing Organization JSON-LD with `sameAs: [...]` from `SOCIALS` so Google connects the brand to the socials.

Header stays minimal — no social icons there.

## 2. Brand assets

Current "two feet" is the lucide `Footprints` icon — fine placeholder but not ownable. Recommended:

1. **Generate a proper two-feet mark** (`src/assets/logo-mark.png`, 512×512, transparent) — stylised footprints with implied forward motion, single colour using `--primary`. Swap into Header in place of the lucide icon.
2. **Favicon set** derived from the mark — replace `public/favicon.svg`, `favicon.png`, `apple-touch-icon.png`.
3. **OG share image** (`public/og-image.png`, 1200×630, premium tier for legible type) — mark + wordmark + tagline "Find your next race" on brand-coloured background. Replaces existing `og-image.png`.
4. **Header wordmark** stays as today; only the icon container is swapped.

Note: social/search platforms cache OG images. After swap you'll need to force a refresh in each platform's link debugger (LinkedIn Post Inspector, X Card Validator, Facebook Sharing Debugger) to see the new image immediately.

### About page rewrite (`src/routes/about.tsx`) — final copy

> **What this is**
>
> Running Events Near Me is a free UK race directory. 5Ks to ultras, road to trail, parkrun to multi-terrain — searchable by postcode, region, and distance. No account. No sign-up. Just races.
>
> **Why it exists**
>
> Finding a race near you shouldn't take longer than running one. Race listings in the UK are scattered across governing body portals, club websites, and Facebook groups nobody checks. This is the place that pulls it all together.
>
> **How the data works**
>
> Events are sourced from England Athletics, Scottish Athletics, Welsh Athletics, Athletics NI, individual research and organiser submissions. Every listing links directly to the official organiser page (or booking page if no website), for entries, pricing, and the details that change. We don't publish prices. Things move. Check the source before you travel.

**CTA block** at the bottom:

> Got a race that isn't listed? Running a club?
>
> Both are free. Both link back to you — not to us.
>
> **[ Submit an event ]** **[ Claim your club ]**

Buttons link to `/list-your-event` and `/running-clubs` respectively (matches existing routes). Page `head()` updated: title "About — Running Events Near Me", new description derived from the opening paragraph, canonical + og:url self-referencing `/about`.

## 3. Live "active events" ticker

Single-purpose component on the homepage hero. Counts ACTIVE, non-duplicate events. Naturally ticks up when cron syncs publish new events or when you flip a hidden event live.

**New: `src/lib/stats.functions.ts`**

```ts
export const getLiveStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { count } = await supabasePublic
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "ACTIVE")
    .is("duplicate_of", null);
  return { activeEvents: count ?? 0, updatedAt: new Date().toISOString() };
});
```

Uses the server publishable client (no service-role leak, no admin client in a `.functions.ts` — matches existing project rules). Existing `events` SELECT policy already allows anon reads; no DB changes.

**New: `src/components/home/LiveEventCounter.tsx`**

- `useSuspenseQuery({ queryKey: ["live-stats"], queryFn: getLiveStats, refetchInterval: 60_000, refetchIntervalInBackground: false })`.
- ~30 lines: `useEffect` + `requestAnimationFrame` counts from previous → new value over 800ms with easeOutCubic. No new dependency.
- Renders large number + small caption "UK races live right now". `aria-live="polite"`.
- Respects `prefers-reduced-motion` — snaps instead of animating.

**`src/routes/index.tsx`**

- Loader calls `context.queryClient.ensureQueryData({ queryKey: ["live-stats"], queryFn: getLiveStats })` so initial number is SSR'd (no hydration flash, no layout shift).
- `<LiveEventCounter />` placed in the hero beneath `LocationPrompt` as a one-line stat strip — easy to extend later ("X added this week") without restructuring.

**Explicitly NOT doing:**
- No counter table cron increments. DB count is already the source of truth.
- No realtime subscription. 60s polling is enough and costs nothing.
- No cron-side wiring.

## Order of work

1. Socials — `site.ts` + `Footer.tsx` + JSON-LD.
2. Live counter — server fn + component + loader wiring + hero placement.
3. Brand assets — generate mark/favicon/OG, swap into Header + `public/`, rewrite `about.tsx` with the copy above.
