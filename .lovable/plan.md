# Fix Run to Anfield organiser URL

## Change

Update the `runabc-run-to-anfield` event in the database: replace the incorrect copy-paste `organiser_url` (`babcock10kseries.co.uk`) with the correct one:

`https://www.liverpoolfc.com/foundation/run-anfield`

## How

- Single data update on the `events` table, keyed on `norm_id = 'runabc-run-to-anfield'`
- Verify afterwards by re-reading the row

No code, schema, or frontend changes.
