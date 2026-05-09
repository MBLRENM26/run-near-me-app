## Add Plausible analytics

Add the Plausible tracking snippet site-wide via the root route's `head()` in `src/routes/__root.tsx` so it loads on every page.

### Changes

**`src/routes/__root.tsx`** — extend `head()` to include:

- `scripts`: an async external script `https://plausible.io/js/pa-PgTPkGiODRA9udffr9GAg.js`
- An inline init script that defines `window.plausible` queue and calls `plausible.init()`

TanStack Start's `head()` supports a `scripts` array. Each entry can be either an external `src` (with `async: true`) or an inline `children` string. Both will be rendered into `<head>` via `<HeadContent />`, which is already in `RootShell`.

### Notes

- No package install needed — pure script tags.
- No component or UI changes; the Header component is untouched (the snippet just goes in the document head, not visually in the header).
- Domain auto-detected by Plausible from the script ID, so no extra config required.
