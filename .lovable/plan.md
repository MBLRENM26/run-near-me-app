## What GSC is telling us

Google has `https://runningeventsnearme.com/events/$slug` (the literal template placeholder) in its index queue and our server returns **HTTP 500** for it instead of a clean 404. Confirmed live:

```
curl -I https://runningeventsnearme.com/events/%24slug
→ HTTP/2 500
```

The bad URL is **not** in our sitemap and **not** linked from the homepage, so Google picked it up from an old crawl / external mention. The problem isn't that Google found it — it's that we answer 5xx instead of 404, which is what triggers the "Server error (5xx)" report.

### Why it 500s today

`src/routes/events.$slug.tsx` has no slug-format guard. The literal `$slug` flows into the loader (`getEventPageData`) and something on that path throws an unhandled error during SSR rather than the intended `throw notFound()`. The flat-slug catch-all `src/routes/$slug.tsx` already guards with `^[a-z0-9-]+$` — the nested event routes don't.

## Fix

Add the same cheap regex guard in `beforeLoad` on the dynamic detail routes so any malformed slug returns 404 before we touch the DB or SSR-render anything.

Routes to patch:
- `src/routes/events.$slug.tsx`
- `src/routes/running-events.$slug.tsx`
- `src/routes/running-clubs.$slug.tsx`
- `src/routes/parkrun-events.$slug.tsx`
- `src/routes/running-events.$slug_.$distance.tsx` (validate both `slug` and `distance`)

Shape:

```ts
beforeLoad: ({ params }) => {
  if (!/^[a-z0-9-]+$/.test(params.slug)) throw notFound();
},
```

For the distance route also check `params.distance` against the same pattern.

## After deploy

1. Re-curl `/events/%24slug` and confirm 404.
2. In GSC, open the "Server error (5xx)" report and click **Validate fix**. Google will recrawl the sampled URLs; once they return 404 the issue moves to "Passed".
3. No sitemap change needed — the URL was never in it.

## Out of scope (deferred)

Tracking down *why* the loader path 500s instead of cleanly throwing `notFound()` for a non-matching slug. The guard makes it unreachable from crawlers and typos, so the underlying bug is no longer user-visible. Worth a follow-up if other 5xx reports surface.