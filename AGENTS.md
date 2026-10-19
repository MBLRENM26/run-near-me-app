
- Month listing pages compute their counts through `src/lib/month-summary.ts` (pure, tested); reuse it for any other "what is on when" surface instead of recounting — keeps every count consistent and data-only.
- Monthly host-club links use a private server reader and pure resolver requiring accepted verified organising links and unique approved crosswalks; only public club names/slugs and eligible event IDs leave the server, to avoid leaking identity evidence or turning candidate matches into public claims.
- Rich race research is stored in private append-only assertions and review audit tables, with file-hash idempotency and no event projection; keep it separate from monitor payloads because researcher confidence, occurrence identity and human acceptance are distinct.
