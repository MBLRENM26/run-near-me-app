/** Pure helpers for the embeddable "Upcoming races" box. No I/O. */
import { SITE_URL } from "./site";

export type EmbedKind = "club" | "county";
export type EmbedTheme = "light" | "dark";
export type EmbedRace = { slug: string; name: string; when: string; town: string | null; distances: string | null };

export const EMBED_MAX_RACES = 10;

export function parseEmbedKind(v: string): EmbedKind | null {
  return v === "club" || v === "county" ? v : null;
}
export function parseEmbedTheme(v: string | null): EmbedTheme {
  return v === "dark" ? "dark" : "light";
}

/** Tag a site link so visits from embeds show as their own referral source. */
export function withEmbedUtm(path: string, kind: EmbedKind, slug: string): string {
  const u = new URL(path, SITE_URL);
  u.searchParams.set("utm_source", "embed");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", `${kind}-${slug}`);
  return u.toString();
}

/** Tag a shared race link with its social platform. */
export function withShareUtm(url: string, platform: string): string {
  const u = new URL(url, SITE_URL);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", "social");
  return u.toString();
}

export function embedSnippet(kind: EmbedKind, slug: string, theme: EmbedTheme): string {
  const src = `${SITE_URL}/api/public/embed/${kind}/${slug}?theme=${theme}`;
  return `<iframe src="${src}" title="Upcoming races" width="100%" height="420" style="border:0;max-width:480px" loading="lazy"></iframe>`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function renderEmbedHtml(opts: {
  kind: EmbedKind; slug: string; heading: string; races: EmbedRace[]; theme: EmbedTheme; morePath: string;
}): string {
  const dark = opts.theme === "dark";
  const bg = dark ? "#14181f" : "#ffffff", fg = dark ? "#f2f4f7" : "#14181f", mute = dark ? "#a3aab5" : "#5b6472", line = dark ? "#2a313c" : "#e5e7eb", accent = dark ? "#7cc4ff" : "#0b5cad";
  const items = opts.races.slice(0, EMBED_MAX_RACES).map((r) => {
    const meta = [r.when, r.town, r.distances].filter(Boolean).map((x) => esc(String(x))).join(" · ");
    return `<li><a href="${esc(withEmbedUtm(`/events/${r.slug}`, opts.kind, opts.slug))}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${meta}</span></li>`;
  }).join("");
  const body = items ? `<ul>${items}</ul>` : `<p class="empty">No upcoming races confirmed yet.</p>`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title><style>
body{margin:0;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;background:${bg};color:${fg}}
.w{padding:14px 16px}h2{font-size:16px;margin:0 0 8px}ul{list-style:none;margin:0;padding:0}
li{padding:9px 0;border-top:1px solid ${line}}li a{color:${accent};font-weight:600;text-decoration:none;display:block}li a:hover{text-decoration:underline}
li span,.empty,.f{color:${mute};font-size:12px}.f{margin-top:10px;display:flex;justify-content:space-between;gap:8px}.f a{color:${mute}}
</style></head><body><div class="w"><h2>${esc(opts.heading)}</h2>${body}<div class="f"><a href="${esc(withEmbedUtm(opts.morePath, opts.kind, opts.slug))}" target="_blank" rel="noopener">See all races</a><a href="${esc(withEmbedUtm("/", opts.kind, opts.slug))}" target="_blank" rel="noopener">Powered by Running Events Near Me</a></div></div></body></html>`;
}
