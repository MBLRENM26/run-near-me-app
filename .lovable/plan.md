## 1. Kent → South East redirect

In `src/routes/running-events.$slug.tsx`, update the `beforeLoad` to redirect known legacy/county slugs to their region. Use TanStack Router's `redirect()` with status 301:

```ts
import { redirect } from "@tanstack/react-router";

const SLUG_REDIRECTS: Record<string, string> = {
  kent: "south-east",
};

beforeLoad: ({ params }) => {
  const target = SLUG_REDIRECTS[params.slug];
  if (target) {
    throw redirect({
      to: "/running-events/$slug",
      params: { slug: target },
      statusCode: 301,
    });
  }
  if (!slugToRegion(params.slug)) throw notFound();
},
```

This makes `/running-events/kent` 301 → `/running-events/south-east` server-side and is easy to extend for other counties later.

## 2. Homepage meta description (exact copy)

In `src/routes/__root.tsx`, replace the description text on:

- `name="description"`
- `property="og:description"`
- `name="twitter:description"`

New text added:

> Find your next race as a beginner, amateur or a Pro. Discover 5Ks, 10Ks, half marathons, marathons and trail runs near you! 1,900+ running events across the UK in 2026 and more added each day.

Title tags change. Title Changes to: "Running Events Near Me - Find Your Next Race in Any Region of the UK at Any Distance"  
  
OG image, dimensions, etc. stay as-is.

## Notes

- After publishing, re-run the OG validator to confirm.