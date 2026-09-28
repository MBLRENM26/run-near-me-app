import { describe, expect, it } from "vitest";
import { sitemapResponse } from "./sitemap-response";

const urls = [
  { loc: "https://example.com/events/race?x=1&y=2", changefreq: "weekly", priority: "0.7" },
];

describe("sitemap response", () => {
  it("does not replace the sitemap with a cached partial success on a source failure", async () => {
    const result = sitemapResponse(urls, false);
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("retry-after")).toBe("300");
    expect(await result.text()).not.toContain("<urlset");
  });

  it("escapes XML and omits unsupported freshness claims", async () => {
    const result = sitemapResponse(urls, true);
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toContain("application/xml");
    const body = await result.text();
    expect(body).toContain("race?x=1&amp;y=2");
    expect(body).not.toContain("<lastmod>");
  });
});
