# Stabilise the pipes before anything else

## What is actually wrong (checked live today, 28 Sep)

A Google penalty is very unlikely. Competitor reports don't trigger manual actions on their own, and Search Console would list a manual action. The main problem is inside RENM: the automatic jobs have been failing without anyone seeing it.

| Area | Finding |
|---|---|
| England Athletics weekly sync | Failed 3 Mondays in a row (14, 21, 28 Sep). The database step times out while it waits for each chunk, so nothing gets imported automatically. That's why you've had to run imports by hand. |
| Scottish Athletics weekly sync | Cron says "succeeded", but the site returned **401 Unauthorized** today at 03:00, so no import happened. |
| Missed-submission safety net | Also **401** today at 08:15. |
| Emails | The email system does work. Reminder confirmations were sent up to 16 Sep, and sync summaries up to 18 Sep. Since then no emails have been triggered, because the jobs that trigger them are failing. Scheduled reminders are switched off on purpose (job 6, D48/D49). |
| New events | Events only came in when we imported by hand (186 in the week of 14 Sep, none since). This is why fewer new events are arriving. |

It's the same 401 cause we found on 30 July: the secret stored in the database doesn't match the site's `IMPORT_SECRET`.

## Plan (each step gated separately)

1. **Check the Google penalty question (read-only).** Look at Search Console for manual actions and security issues, and at homepage indexing. Report the result. Nothing changes.
2. **Fix the 401s.** Re-sync the stored database secret with the site's `IMPORT_SECRET`, then confirm one non-401 response from the harmless missed-submissions endpoint. Job 6 stays inactive. Reminders stay fail-closed.
3. **Fix the England Athletics timeout.** Rewrite the job so each chunk is sent in the background instead of blocking one long database statement. The Monday cron sends the first chunk. Each chunk's response starts the next one, or a short follow-up cron works through pending chunk ranges. Test with one manual run and check the sync-run log.
4. **Stop silent failures.** Add a daily check that records each cron's HTTP status and emails an admin summary on any non-200. A 401 or timeout then shows up the same day, not weeks later.
5. **Then the Google growth work** from the last session: 2027 recurrence pages for top rising queries, and course depth. Only after steps 1–4 are proven.

## Out of scope

No reminder sending, no messages to past subscribers, no Kent/South London data, and no schema changes beyond cron/job wiring.

## Technical details

- Evidence: `cron.job_run_details` for job 4 shows `statement timeout` in `net._await_response` inside `run_england_athletics_chunked()` (synchronous `http_collect_response`). `net._http_response` ids 237/239 show 401 for jobs 5 and 43.
- Step 2 uses `public.set_import_secret()`. The value has to match the deployed `IMPORT_SECRET`. We may need to rotate it and publish so preview and production match.
- Step 3: replace the blocking loop with async `net.http_post` fan-out, or a state table of pending ranges drained by a minutely cron that stops itself when finished.
- Rollback: re-point job 4 to the old function, and the secret change is reversible.
