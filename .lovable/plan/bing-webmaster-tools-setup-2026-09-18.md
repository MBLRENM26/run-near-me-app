# Bing Webmaster Tools setup

## What the investigation found

- Bing now sends more traffic than Google (503 vs 310 sessions in the last 30 days).
- The site has **no Bing Webmaster Tools verification**: no `msvalidate.01` meta tag in the homepage HTML and no `BingSiteAuth.xml` (404).
- Consequence: Bing performance can only be seen as referrer sessions in analytics — no Bing query, impression, index-coverage or crawl data.
- robots.txt already advertises the sitemap, so Bing is crawling fine; this is purely about measurement.

## Recommended approach: import from Google Search Console (no code change)

Bing Webmaster Tools can import a verified Google Search Console property directly. Because `sc-domain:runningeventsnearme.com` is verified in GSC, Mike can:

1. Go to https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console** and authorise with the same Google account.
3. Select runningeventsnearme.com — Bing imports the property and the sitemap automatically.

This requires no code, no publish, and no new credentials. It is the fastest path and avoids adding another verification tag to maintain.

## Fallback (only if the GSC import fails): meta-tag verification

If the import path is unavailable, the code fallback is:

- Add one line to the document head in `src/routes/__root.tsx`:
  `<meta name="msvalidate.01" content="..." />` using the token Bing provides.
- Publish so the tag is live, then complete verification in Bing Webmaster Tools.
- Sitemap submission happens through the Bing dashboard (or is picked up from robots.txt).

## Out of scope

- No changes to sitemap contents, robots rules, indexability, or any event/page data.
- No Bing Places or IndexNow integration (can be considered later as a separate approved package).

## Verification

- After import: confirm the property appears in Bing Webmaster Tools with sitemap status "Success".
- After meta-tag fallback: `curl -s https://runningeventsnearme.com/ | grep msvalidate` returns the tag, and Bing reports the site verified.
