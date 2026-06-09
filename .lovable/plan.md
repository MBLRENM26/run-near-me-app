# Finish the two remaining actions

Both connectors are now linked and verified:
- **Search Console**: `runningeventsnearme.com` domain property, owner access confirmed
- **Google Sheets**: pipeline sheet accessible, `URL_REVIEW` tab found

## 1. Google Search Console — indexing health pull

- Query the Search Console API for the domain property:
  - URL inspection / index coverage data via the Search Analytics API (impressions, clicks, indexed pages)
  - Sitemap status for `sitemap.xml` (submitted vs indexed counts, errors)
- Surface the affected-URL lists behind the previously reported soft-404 / noindex / structured-data issues
- Report findings back with a recommended fix list (no code changes until reviewed)

## 2. Organiser URL corrections — dry run, then apply

- Read `URL_REVIEW!A:N` from the sheet
- Filter rows: skip any where column N is blank, "no website", "no event found", or "date conflicts"
- Match column A (`norm_id`) against `events.slug` in the database
- **Dry-run report first**: total rows in tab → rows passing the filter → rows matched to an event → sample of before/after `organiser_url` values, plus any unmatched `norm_id`s
- After your approval, apply the ~220 `UPDATE events SET organiser_url = ...` changes in one batch (data update, not a migration)
- Post-apply verification: count of updated rows and spot-check sample

## Technical details

- Both steps run via the connector gateway at build time (curl from sandbox) — no new code, routes, or secrets needed
- Database updates use the data-insert tool (UPDATE statements), keyed on `slug`, scoped only to matched rows
- No frontend changes; no schema changes

Nothing further is needed from you — approve and I'll run the dry-run and GSC pull.