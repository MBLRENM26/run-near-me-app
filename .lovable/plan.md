## Fix OG/meta validator issues

Three small fixes in `src/routes/__root.tsx` plus regenerating the OG image.

### 1. Regenerate OG image at 1200×630

Replace `public/og-image.png` with a fresh 1200×630 render using the existing branded design: white background, brand-green rounded square tile (~160×160) with white Footprints icon on the left, stacked text "Running Events Near Me" (~60px bold) and "Find your next race." (~34px) on the right. Use `imagegen--generate_image` at premium quality (text legibility) with `width: 1200, height: 640` (next multiple of 32 ≥ 630), then crop to exactly 1200×630 with ImageMagick.

### 2. Title tag (50–60 chars)

In `src/routes/__root.tsx`, update both `title` meta entries to:
`"Running Events Near Me — Find Your Next Race in the UK"` (54 chars)

Also update the `og:title` and `twitter:title` entries to match.

### 3. Meta description + og:description (full text)

Currently the root file has duplicate `description` / `og:description` / `twitter:description` entries — the first set (69-char short version) is overriding what the validator picks up. Remove the duplicates and keep only the full text:

`"Find your next race. Discover 5Ks, 10Ks, half marathons, marathons and trail runs near you — 1,900+ running events across the UK in 2026."`

Apply to `description`, `og:description`, and `twitter:description`.

### Technical notes

- `src/routes/__root.tsx` currently has duplicated `og:image` / `twitter:image` entries (one pointing at `${SITE_URL}/og-image.png`, another at an old R2 URL). Remove the R2 duplicates so the validator sees a single, correct 1200×630 image.
- No changes to `src/routes/index.tsx` or per-route heads needed — homepage `head()` doesn't override title/description with shorter values once root is fixed (it sets its own slightly different title, which is fine; if you want the validator-approved title everywhere, also update the homepage `head()` title and og:title to the same 54-char string).
- After image regen, verify dimensions with `identify public/og-image.png` before finishing.
