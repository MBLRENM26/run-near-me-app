
- Month listing pages compute their counts through `src/lib/month-summary.ts` (pure, tested); reuse it for any other "what is on when" surface instead of recounting — keeps every count consistent and data-only.
- Monthly host-club links use a private server reader and pure resolver requiring accepted verified organising links and unique approved crosswalks; only public club names/slugs and eligible event IDs leave the server, to avoid leaking identity evidence or turning candidate matches into public claims.
