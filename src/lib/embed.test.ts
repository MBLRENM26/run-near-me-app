import { describe, expect, it } from "vitest";
import { renderEmbedHtml, withEmbedUtm, withShareUtm, parseEmbedKind, EMBED_MAX_RACES } from "./embed";

describe("embed", () => {
  it("tags embed links as utm_source=embed", () => {
    const u = new URL(withEmbedUtm("/events/x", "club", "abc"));
    expect(u.searchParams.get("utm_source")).toBe("embed");
    expect(u.searchParams.get("utm_campaign")).toBe("club-abc");
  });
  it("tags share links as social", () => {
    const u = new URL(withShareUtm("https://runningeventsnearme.com/events/x", "whatsapp"));
    expect(u.searchParams.get("utm_source")).toBe("whatsapp");
    expect(u.searchParams.get("utm_medium")).toBe("social");
  });
  it("rejects unknown kinds", () => {
    expect(parseEmbedKind("organiser-portal")).toBeNull();
  });
  it("caps races and escapes names", () => {
    const races = Array.from({ length: 15 }, (_, i) => ({ slug: `r${i}`, name: `<b>R${i}</b>`, when: "1 Jan", town: null, distances: null }));
    const html = renderEmbedHtml({ kind: "county", slug: "kent", heading: "Kent", races, theme: "light", morePath: "/running-events-in/kent" });
    expect((html.match(/<li>/g) ?? []).length).toBe(EMBED_MAX_RACES);
    expect(html).not.toContain("<b>R0</b>");
  });
});
