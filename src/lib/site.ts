// Canonical site URL — update this when you connect a custom domain.
// Used for absolute OG image URLs, canonical links, and JSON-LD.
export const SITE_URL = "https://runningeventsnearme.com";
export const SITE_NAME = "Running Events Near Me";

// Bump in January each year — used in distance landing page titles, FAQs, etc.
export const CURRENT_YEAR = 2026;

// Social handles. Add X / LinkedIn once registered — order here drives the
// footer icon row and the Organization sameAs[] array in JSON-LD.
export const SOCIALS = [
  {
    label: "Instagram",
    handle: "@runningeventsnearme",
    href: "https://instagram.com/runningeventsnearme",
  },
  {
    label: "TikTok",
    handle: "@runningeventsnearme",
    href: "https://tiktok.com/@runningeventsnearme",
  },
] as const;
