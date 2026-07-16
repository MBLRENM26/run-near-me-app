# Close out the 410 rollout cleanly

Two parts: (1) forensics on the 500 window before we publish again, (2) ship the already-staged sentinel fix and produce raw curl evidence for checks #2–#4.

## 1. Forensics on the 500 window (read-only, before publish)

Answer both questions with evidence, not inference:

**a) How long was the broken build live?**
- Check git log / publish history for the commit that introduced `throw new Response(..., { status: 410 })` in `src/lib/events.functions.ts` — that's the start of the window.
- End of the window = the next publish (the sentinel fix, once it ships).
- Report both timestamps and the elapsed duration.

**b) Did Googlebot hit any of the 4 URLs during that window?**
- Query server-function logs (`stack_modern--server-function-logs`, `deployment='published'`) filtered by each of the 4 slugs:
  - `power-of-5k`
  - `the-ealing-mile`
  - `serpentine-last-friday-of-the-month-5k`
  - `ironbridge-half-marathon-ironbridge-2026`
- For any hits, report user-agent (Googlebot signature), timestamp, and response status.
- If logs don't retain UA, say so explicitly rather than infer.

Deliverable: a short table — build-live-from → build-live-to → duration → Googlebot hits per URL (count + timestamps, or "no signal in retained logs").

## 2. Publish the sentinel fix + raw curl evidence

The sentinel-based code is already staged (return `{ gone: true }` from `getEventPageData`, loader calls `setResponseStatus(410)` + `setResponseHeader('X-Robots-Tag', 'noindex')`). No further code changes planned unless forensics surfaces something.

Steps:
1. Publish via `preview_ui--publish`.
2. Wait for deploy, then run raw `curl -sSI` against production for:
   - **Check #2** — all 4 past-90d ACTIVE URLs → expect `HTTP/2 410` + `x-robots-tag: noindex`.
   - **Check #3** — one upcoming noindexed slug pulled from the indexability admin panel (or a `read_query` against events with `indexable=false` + future `sort_date`) → expect `HTTP/2 200` + `x-robots-tag: noindex` in the **response headers**, not just meta.
   - **Check #4** — `/list-your-event?claim=foo` → expect `HTTP/2 200`, reconfirm unchanged.
3. Paste the raw status line + full header block for each URL directly into the reply — no summary table substitution.

## Not doing

- No retroactive fix for the 500 window (as user confirmed).
- No changes to the sentinel code unless step 2 fails, in which case I stop and report before iterating.
