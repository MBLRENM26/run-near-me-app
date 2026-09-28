#!/usr/bin/env node
// Read-only acceptance check: inspect initial HTML without executing JavaScript.
// Usage: node scripts/verify-search-discovery.mjs [origin]
import assert from "node:assert/strict";

const origin = new URL(process.argv[2] ?? "https://runningeventsnearme.com").origin;
const paths = [
  "/running-events/east-of-england",
  "/running-events/london",
  "/running-events/south-west",
  "/scottish-athletics-permitted-races",
];
let failures = 0;
for (const path of paths) {
  try {
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30_000) });
    assert.equal(response.status, 200, "Expected HTTP 200");
    const html = await response.text();
    const links = new Set([...html.matchAll(/href="(\/events\/[^"?#]+)"/g)].map((m) => m[1]));
    assert.ok(links.size > 0, "No race links in initial HTML");
    assert.ok(!html.includes("Loading events…"), "Client-only loading placeholder remains");
    assert.ok(!/name="robots"[^>]*content="[^"]*noindex/i.test(html), "Directory is noindex");
    console.log(`PASS ${path}: ${links.size} race links in initial HTML`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
process.exitCode = failures ? 1 : 0;
