# Investigation: "Discover events across the UK" not visible

## What I checked

**Data side — healthy.** The query criteria match 782 rows in the DB; the top 20 by `is_featured desc, sort_date asc` all have trusted entry/organiser URLs (saledragons.org.uk, avonvalleyrunners, runtrue, etc.), so the post-filter would keep ~8. The query itself is not the problem.

**Runtime side — two real issues:**

1. **Stale JS chunk.** Console shows:
   `Failed to fetch dynamically imported module: /assets/index-DYxMVJBd.js`
   This is the preview serving an old bundle reference after the last edit. The section literally can't render because the route module failed to load — the whole page falls back / blanks parts of the render. A hard reload normally clears this, but if it persists the cause is something else (see #3).

2. **Section is gated on `!coords`.** In `src/routes/index.tsx`:
   ```tsx
   {!coords && upcomingEvents && upcomingEvents.length > 0 && (...)}
   ```
   `coords` comes from `?lat=&lng=` in the URL. From the session replay you've been navigating between `/running-events/...` and `/` with query params several times — if the URL still carries `lat`/`lng`, the "Discover events across the UK" block is intentionally hidden and the "Featured events near you" / nearby list takes over instead. This isn't a bug in the new query, it's the existing visibility rule.

## Proposed fix

Two small, targeted changes — no behaviour creep:

### 1. Make the dynamic-import error self-heal
Add a one-line listener in `src/routes/__root.tsx` that catches `Failed to fetch dynamically imported module` and does a single `location.reload()`. Standard TanStack/Vite pattern for stale chunks after redeploys. Prevents the user from seeing a half-rendered page after any future deploy.

### 2. Show the UK discovery section even when a location is set
Right now it's hidden the moment coords exist. That's why you're not seeing it on `/` — your URL almost certainly still has `?lat=&lng=` from earlier navigation.

Change the gate so the section renders in both states, just lower on the page when coords are set (below "Featured events near you", above "Browse by region"). The query is already strong enough that it's a useful "what else is on across the UK" row regardless of whether the user has set a location.

If you'd rather keep the strict `!coords` gate, I'll instead add a "Clear location" affordance so it's obvious why the section disappeared — but unhiding it is the cleaner answer.

## Out of scope
- No changes to the query, filters, or limit (data is correct)
- No changes to the trust/link rules
- No changes to other sections

## Verification
- Reload `/` with no query params → section shows 6–8 races.
- Reload `/?lat=51.5&lng=-0.1&label=London` → "Featured/nearby" shows AND "Discover events across the UK" shows below it.
- Force a stale chunk (simulate by editing then revisiting) → page auto-reloads once instead of blanking.

Want me to proceed with both, or just the visibility change?
