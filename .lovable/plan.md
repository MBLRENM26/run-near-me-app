Pre-publish verification plan

Goal: confirm the site is safe to publish after the recent rate-limiting / Node crypto refactor.

1. Build verification
   - Run the production build (`bun run build`).
   - Confirm it completes with no errors.
   - Search the client bundle / source for any lingering `node:crypto`, `crypto.randomBytes`, or references to the deleted `client-ip.server.ts`.

2. Security scan
   - Run `security--run_security_scan`.
   - Confirm no new findings are introduced.

3. Submission smoke test
   - Use Playwright to open `/list-your-event`.
   - Submit one test event with valid structured data.
   - Verify the form submits successfully (not 429, not 500).
   - Confirm the admin notification / submission appears in the backend.

4. Data integrity check
   - Run the canonical events fingerprint query:
     `SELECT md5(string_agg(md5(to_jsonb(e)::text), ',' ORDER BY e.id)) FROM public.events e;`
   - Confirm the result is `35328eec4f5c0a1086ef84fdd6e03f69`.

5. Report
   - Summarise pass/fail for each step.
   - Give a clear publish/no-publish recommendation.

No database migrations or schema changes are required. No new dependencies will be installed.