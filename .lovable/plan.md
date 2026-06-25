# Apply the 208 safe changes now

Both the preview iframe and the published URL talk to the same database, so committing from the iframe writes the dates straight into production. The published-URL "Unauthorized" is just a separate cookie/session quirk on that host — it doesn't affect the integrity of the import you've already previewed.

## Do this now

1. Click **Apply changes** in the iframe and confirm the prompt.
2. Wait for the result panel — you should see `Written: 208`, `Failed: 0`, `Unmatched: 0`, `Protected: 0`. Anything non-zero in `Failed` or `Unmatched`, tell me and I'll dig in.
3. Spot-check 1–2 events on the public site (or via Admin → Events) to confirm the new dates show up and `date_is_estimated` is correct.

## Then — fix the published-URL auth (separate workstream, no rush)

You don't need this resolved to do the import, but it's worth fixing so future enrichment runs work from anywhere. Once you confirm the 208 wrote cleanly, I'll:

1. Add a one-line server log in `previewDateEnrichments` recording whether the `admin_session` cookie arrived and whether the HMAC verified.
2. Ask you to retry on `run-near-me-app.lovable.app` once.
3. Read `server-function-logs` to see exactly which branch fails — almost certainly either (a) the cookie isn't being sent on the published host (likely a `sameSite`/domain mismatch between `run-near-me-app.lovable.app` and your custom domain `runningeventsnearme.com`) or (b) `ADMIN_SESSION_SECRET` differs between deployments and HMAC verify fails.
4. Fix the actual cause and remove the temporary log.

## Out of scope this turn

No code changes — just commit the import you've already validated.
