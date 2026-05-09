## Add favicon + OG image using the brand mark

Generate brand assets matching the existing header logo (Lucide `Footprints` icon, white on green primary `oklch(0.62 0.17 145)` ≈ `#2e9b3f`, rounded square), then wire them into the document head.

### Assets to generate

Write all to `public/` so they're served at the site root:

1. **`public/favicon.svg`** — hand-authored SVG: rounded-square (radius ~20%) filled with brand green, white Lucide Footprints glyph centered. Vector source for crisp rendering at all sizes.
2. **`public/favicon.png`** — 512×512 PNG rasterized from the SVG (via ImageMagick / `nix run nixpkgs#imagemagick`).
3. **`public/favicon.ico`** — multi-size ICO (16, 32, 48) from the PNG.
4. **`public/apple-touch-icon.png`** — 180×180 PNG (iOS home screen).
5. **`public/og-image.png`** — 1200×630 share card. Composition:
   - Solid white background (`oklch(0.995 0 0)` ≈ `#fdfdfd`)
   - Brand-green rounded-square logo tile (~140px) on the left
   - To its right, stacked text:
     - **"Running Events Near Me"** — bold, ~64px, near-black foreground
     - **"Find your next race."** — regular, ~36px, muted grey
   - Generated via a Node/sharp or ImageMagick script composing the SVG + text. Inter font (already used in app) loaded from Google Fonts or system fallback.

### Head wiring

In `src/routes/__root.tsx`, extend `head().links` and `head().meta`:

- `links`:
  - `{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }`
  - `{ rel: "icon", href: "/favicon.ico", sizes: "any" }`
  - `{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" }`
- `meta` additions:
  - `{ property: "og:image", content: "/og-image.png" }`
  - `{ property: "og:image:width", content: "1200" }`
  - `{ property: "og:image:height", content: "630" }`
  - `{ name: "twitter:card", content: "summary_large_image" }` (upgrade from existing `summary`)
  - `{ name: "twitter:image", content: "/og-image.png" }`

Existing `og:title`, `og:description`, `og:type` stay as-is.

### QA

After generation, view each PNG to confirm: logo crisp, text not clipped, colors match brand, no overlap. Iterate if needed.

### Out of scope

Per-route `og:image` overrides (region pages) — root-level default only for now.
