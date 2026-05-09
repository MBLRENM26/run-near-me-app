## Fix invalid OG image URL

**Root cause:** `src/lib/site.ts` sets `SITE_URL = "https://runningeventsnearme.lovable.app"`, but that subdomain returns 404. The actual live domain is `https://runningeventsnearme.com`. So every absolute OG/canonical/JSON-LD URL the app emits points at a dead host, which is why the OpenGraph validator says the image is unreachable.

Verified just now:
- `https://runningeventsnearme.lovable.app/og-image.png` → 404
- `https://runningeventsnearme.com/og-image.png` → 200 (image/png) ✅
- `https://run-near-me-app.lovable.app/og-image.png` → 302 → `runningeventsnearme.com`

### Fix

One-line change in `src/lib/site.ts`:

```ts
export const SITE_URL = "https://runningeventsnearme.com";
```

This automatically corrects:
- `og:image` / `twitter:image` (root)
- `og:url` (root + homepage + region pages)
- `canonical` link on homepage and region pages
- `WebSite` and `CollectionPage` JSON-LD `url` fields

### Validation

After publish, re-run the OpenGraph validator against `https://runningeventsnearme.com/`. Image should resolve and meta tags should match.

No other code changes needed.
