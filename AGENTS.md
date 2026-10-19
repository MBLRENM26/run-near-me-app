
- Month listing pages compute their counts through `src/lib/month-summary.ts` (pure, tested); reuse it for any other "what is on when" surface instead of recounting — keeps every count consistent and data-only.
