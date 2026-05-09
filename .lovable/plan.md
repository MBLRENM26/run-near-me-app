## Pre-launch checklist

Quick audit of the project against typical go-live requirements. Most things are in good shape — here's what's done, what's worth fixing before publish, and what can wait.

### ✅ Already in place

- **Routing + SEO basics**: `/`, `/running-events/:slug` with per-route `head()` titles & descriptions
- **`robots.txt`** + dynamic **`sitemap.xml`** (root + all region pages)
- **Favicon set**: `favicon.svg`, `favicon.ico`, `favicon.png`, `apple-touch-icon.png`
- **OG image**: 1200×630, branded, wired into root head
- **Twitter cards**: `summary_large_image`
- **Plausible analytics** loaded site-wide
- **Error & 404 boundaries** on root route
- **Database**: 1894/1900 events with `sort_date`, indexed
- **Performance cap**: 2000-row events fetch (interim until PostGIS)

### ⚠️ Worth fixing before launch

1. **OG image URLs are relative (`/og-image.png`)** — Facebook, LinkedIn, Slack and most scrapers require **absolute** URLs. Switch `og:image` and `twitter:image` to the full `https://…/og-image.png` once the production domain is known. If you publish to a `*.lovable.app` subdomain first, hardcode that; swap to the custom domain when it's connected.

2. **Canonical URL tags** — currently missing. Add `<link rel="canonical" href="…">` per route to prevent duplicate-content issues (preview URL vs production vs custom domain all serving the same HTML).

3. **JSON-LD structured data** — add `WebSite` schema on the homepage and `Event` schema on event listings. Big SEO win for a directory site; helps Google show rich results.

4. **`og:url` and `og:site_name`** — small but standard; improves how shares render.

### 💤 Can wait until after launch

- **PostGIS RPC** for radius search (currently capped at 2000 rows — fine at current scale)
- **Per-region OG images** (root default is good enough for v1)
- **Re-parsing the 6 events with NULL `sort_date`** (manual cleanup or extend the regex)
- **Sitemap submission** to Google Search Console (do once published)
- **Custom domain** (connect via Project Settings → Domains after first publish)

### 🔒 Security

- Run a security scan (Cloud → Security) before publish to catch any RLS misses on the `events` table.

### Recommendation

Fix items 1–4 above (small, ~one short turn of work), then publish. Everything else is fine to ship as-is.
