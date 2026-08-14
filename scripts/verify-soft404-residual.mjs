#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const manifestPath = resolve(scriptDir, "soft404-residual-acceptance-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const aggregatorHosts = [
  "runabc.co.uk",
  "runabc.scot",
  "timeoutdoors.com",
  "findarace.com",
  "letsdothis.com",
  "runningcalendar.co.uk",
  "runningcalendar.ie",
  "englandathletics.org",
  "scottishathletics.org.uk",
  "welshathletics.org",
  "athleticsni.org",
];

function usage() {
  return `RENM soft-404 residual acceptance (read-only)

Usage:
  node scripts/verify-soft404-residual.mjs [options]

Options:
  --base-url <url>       Target origin (default: ${manifest.baseUrl})
  --concurrency <n>      Parallel canonical requests (default: 4)
  --timeout-ms <n>       Per-request timeout (default: 20000)
  --json                 Emit machine-readable JSON only
  --verbose              Print every passing URL as well as failures
  --help                 Show this help
`;
}

function parseArgs(argv) {
  const options = {
    baseUrl: manifest.baseUrl,
    concurrency: 4,
    timeoutMs: 20_000,
    json: false,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      process.stdout.write(usage());
      process.exit(0);
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--base-url") {
      options.baseUrl = argv[++index];
    } else if (arg === "--concurrency") {
      options.concurrency = Number(argv[++index]);
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.baseUrl || !/^https?:\/\//.test(options.baseUrl)) {
    throw new Error("--base-url must be an absolute HTTP(S) URL");
  }
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 12
  ) {
    throw new Error("--concurrency must be an integer from 1 to 12");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error("--timeout-ms must be an integer of at least 1000");
  }
  options.baseUrl = options.baseUrl.replace(/\/$/, "");
  return options;
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(value) {
  return decodeHtml(String(value ?? ""))
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function visibleText(html) {
  return normalizeText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function attribute(tag, name) {
  const quoted = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted) return decodeHtml(quoted[2]);
  const unquoted = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? decodeHtml(unquoted[1]) : null;
}

function tags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function metaContent(html, key, value) {
  for (const tag of tags(html, "meta")) {
    if (normalizeText(attribute(tag, key)) === normalizeText(value)) {
      return attribute(tag, "content") ?? "";
    }
  }
  return "";
}

function canonicalHref(html) {
  for (const tag of tags(html, "link")) {
    const rels = normalizeText(attribute(tag, "rel")).split(" ");
    if (rels.includes("canonical")) return attribute(tag, "href");
  }
  return null;
}

function anchorLinks(html, baseUrl) {
  const links = [];
  const matches = html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const match of matches) {
    const href = attribute(`<a ${match[1]}>`, "href");
    if (!href) continue;
    try {
      links.push({
        href: new URL(href, baseUrl).href,
        text: visibleText(match[2]),
      });
    } catch {
      // Ignore malformed hrefs; the acceptance checks only compare valid URLs.
    }
  }
  return links;
}

function jsonLdValues(html) {
  const values = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (normalizeText(attribute(`<script ${match[1]}>`, "type")) !== "application/ld+json")
      continue;
    try {
      values.push(JSON.parse(decodeHtml(match[2]).trim()));
    } catch {
      values.push({ __parseError: true });
    }
  }
  return values;
}

function findJsonLdType(value, type) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonLdType(item, type);
      if (found) return found;
    }
    return null;
  }
  const declared = value["@type"];
  if (declared === type || (Array.isArray(declared) && declared.includes(type))) return value;
  for (const child of Object.values(value)) {
    const found = findJsonLdType(child, type);
    if (found) return found;
  }
  return null;
}

function parseMigrationPatches() {
  const migration = readFileSync(resolve(repoRoot, manifest.sourceMigration), "utf8");
  const payload = migration.match(/\$patches\$\s*([\s\S]*?)\s*\$patches\$::jsonb/);
  if (!payload) throw new Error(`Patch payload not found in ${manifest.sourceMigration}`);
  return JSON.parse(payload[1]);
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.href;
  } catch {
    return String(value);
  }
}

function isAggregatorUrl(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return aggregatorHosts.some(
      (aggregator) => host === aggregator || host.endsWith(`.${aggregator}`),
    );
  } catch {
    return false;
  }
}

function sitemapCount(xml, absoluteUrl) {
  const needle = `<loc>${absoluteUrl}</loc>`;
  return xml.split(needle).length - 1;
}

function dateFactPresent(text, value) {
  const normalized = normalizeText(value);
  const year = normalized.match(/\b20\d{2}\b/)?.[0];
  const month = normalized.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
  )?.[0];
  return (!year || text.includes(year)) && (!month || text.includes(month));
}

async function fetchPage(baseUrl, path, timeoutMs) {
  const url = new URL(path, `${baseUrl}/`).href;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "RENM-soft404-acceptance/1.0",
        },
      });
      const body = await response.text();
      if (response.status >= 500 && attempt === 1) continue;
      return {
        url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function canonicalAcceptance({ path, response, sitemapXml, patch, baseUrl, retiredSet }) {
  const errors = [];
  const expectedUrl = new URL(path, `${baseUrl}/`).href;
  const html = response.body;
  const text = visibleText(html);
  const links = anchorLinks(html, expectedUrl);
  const event = jsonLdValues(html)
    .map((value) => findJsonLdType(value, "Event"))
    .find(Boolean);
  const title = decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = metaContent(html, "name", "description");
  const robots = metaContent(html, "name", "robots");
  const xRobots = response.headers["x-robots-tag"] ?? "";

  if (response.status !== 200) errors.push(`status ${response.status}, expected 200`);
  if (canonicalHref(html) !== expectedUrl) {
    errors.push(`canonical ${JSON.stringify(canonicalHref(html))}, expected ${expectedUrl}`);
  }
  if (/noindex/i.test(robots)) errors.push(`meta robots contains noindex: ${robots}`);
  if (/noindex/i.test(xRobots)) errors.push(`X-Robots-Tag contains noindex: ${xRobots}`);
  if (!title) errors.push("missing server-rendered title");
  if (!description) errors.push("missing server-rendered meta description");
  if (!event) {
    errors.push("missing valid Event JSON-LD");
  } else {
    if (!event.name) errors.push("Event JSON-LD missing name");
    if (!event.startDate) errors.push("Event JSON-LD missing startDate");
    if (!event.location?.name) errors.push("Event JSON-LD missing location name");
    if (event.name && !text.includes(normalizeText(event.name))) {
      errors.push(`event name is not visible in SSR HTML: ${event.name}`);
    }
    if (event.startDate) {
      const year = String(event.startDate).match(/\b20\d{2}\b/)?.[0];
      if (year && !text.includes(year))
        errors.push(`event year is not visible in SSR HTML: ${year}`);
    }
    if (event.location?.name && !text.includes(normalizeText(event.location.name))) {
      errors.push(`event location is not visible in SSR HTML: ${event.location.name}`);
    }
    const nameLead = normalizeText(event.name).slice(0, 28);
    if (nameLead && !normalizeText(`${title} ${description}`).includes(nameLead)) {
      errors.push("title/description do not reflect the Event JSON-LD name");
    }
  }

  const displayFacts = ["name", "town", "county", "distances", "organiser"];
  for (const field of displayFacts) {
    const value = patch?.target?.[field];
    if (typeof value === "string" && value.trim() && !text.includes(normalizeText(value))) {
      errors.push(`reviewed ${field} is not visible in SSR HTML: ${value}`);
    }
  }
  if (
    typeof patch?.target?.date_raw === "string" &&
    !dateFactPresent(text, patch.target.date_raw)
  ) {
    errors.push(`reviewed date is not visible in SSR HTML: ${patch.target.date_raw}`);
  }

  const expectedOfficialUrls = [patch?.target?.entry_url, patch?.target?.organiser_url]
    .filter((value) => typeof value === "string" && value.trim())
    .filter((value) => !isAggregatorUrl(value))
    .map(normalizeUrl);
  const renderedUrls = new Set(links.map((link) => normalizeUrl(link.href)));
  for (const expected of expectedOfficialUrls) {
    if (!renderedUrls.has(expected))
      errors.push(`reviewed official/entry URL is not rendered: ${expected}`);
  }
  const siteHost = new URL(baseUrl).hostname;
  const eventCtas = links.filter((link) => {
    const host = new URL(link.href).hostname;
    return (
      host !== siteHost &&
      /(enter|official|organiser|event details|registration|results|website)/i.test(link.text)
    );
  });
  const structuredOfficialUrl = event?.offers?.url || event?.organizer?.url;
  if (expectedOfficialUrls.length === 0 && eventCtas.length === 0 && !structuredOfficialUrl) {
    errors.push("no event-specific official or entry destination is rendered");
  }

  const retiredLinks = links
    .map((link) => new URL(link.href).pathname)
    .filter((linkedPath) => retiredSet.has(linkedPath));
  if (retiredLinks.length > 0)
    errors.push(`links to retired alias: ${[...new Set(retiredLinks)].join(", ")}`);

  const sitemapOccurrences = sitemapCount(sitemapXml, expectedUrl);
  if (sitemapOccurrences !== 1) {
    errors.push(`sitemap occurrences ${sitemapOccurrences}, expected 1`);
  }

  return {
    kind: "canonical",
    path,
    status: response.status,
    pass: errors.length === 0,
    errors,
    observed: {
      canonical: canonicalHref(html),
      title,
      description,
      robots,
      xRobots,
      eventName: event?.name ?? null,
      startDate: event?.startDate ?? null,
      location: event?.location?.name ?? null,
      officialUrls: [
        ...new Set([
          ...expectedOfficialUrls,
          ...(structuredOfficialUrl ? [normalizeUrl(structuredOfficialUrl)] : []),
        ]),
      ],
      sitemapOccurrences,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const patches = parseMigrationPatches();
  const patchBySlug = new Map(patches.map((patch) => [patch.slug, patch]));
  const retiredSet = new Set([
    ...manifest.redirects.map((item) => item.from),
    ...manifest.retiredPaths,
  ]);

  // The production sitemap is cached at the CDN for one hour. A unique query
  // string reaches the current database state without mutating or purging the
  // public cache that normal visitors and crawlers use.
  const sitemapPath = `/sitemap.xml?renm_acceptance=${encodeURIComponent(manifest.packageId)}-${Date.now()}`;
  const sitemap = await fetchPage(options.baseUrl, sitemapPath, options.timeoutMs);
  if (sitemap.status !== 200) throw new Error(`Sitemap returned ${sitemap.status}`);

  const canonical = await mapLimit(manifest.canonicalPaths, options.concurrency, async (path) => {
    try {
      const response = await fetchPage(options.baseUrl, path, options.timeoutMs);
      const slug = path.split("/").pop();
      return canonicalAcceptance({
        path,
        response,
        sitemapXml: sitemap.body,
        patch: patchBySlug.get(slug),
        baseUrl: options.baseUrl,
        retiredSet,
      });
    } catch (error) {
      return {
        kind: "canonical",
        path,
        status: null,
        pass: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  const redirects = await mapLimit(
    manifest.redirects,
    options.concurrency,
    async ({ from, to }) => {
      const errors = [];
      try {
        const response = await fetchPage(options.baseUrl, from, options.timeoutMs);
        const location = response.headers.location
          ? new URL(response.headers.location, `${options.baseUrl}/`).href
          : null;
        const expected = new URL(to, `${options.baseUrl}/`).href;
        if (response.status !== 301) errors.push(`status ${response.status}, expected 301`);
        if (location !== expected)
          errors.push(`location ${JSON.stringify(location)}, expected ${expected}`);
        if (sitemapCount(sitemap.body, new URL(from, `${options.baseUrl}/`).href) !== 0) {
          errors.push("alias appears in sitemap");
        }
        const target = await fetchPage(options.baseUrl, to, options.timeoutMs);
        if (target.status !== 200)
          errors.push(`target status ${target.status}, expected direct 200`);
        return {
          kind: "redirect",
          path: from,
          target: to,
          status: response.status,
          pass: errors.length === 0,
          errors,
          observed: { location, targetStatus: target.status },
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        return { kind: "redirect", path: from, target: to, status: null, pass: false, errors };
      }
    },
  );

  const retired = await mapLimit(manifest.retiredPaths, options.concurrency, async (path) => {
    const errors = [];
    try {
      const response = await fetchPage(options.baseUrl, path, options.timeoutMs);
      if (![404, 410].includes(response.status)) {
        errors.push(`status ${response.status}, expected 404 or 410`);
      }
      if (sitemapCount(sitemap.body, new URL(path, `${options.baseUrl}/`).href) !== 0) {
        errors.push("retired URL appears in sitemap");
      }
      return {
        kind: "retired",
        path,
        status: response.status,
        pass: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { kind: "retired", path, status: null, pass: false, errors };
    }
  });

  const all = [...canonical, ...redirects, ...retired];
  const failed = all.filter((item) => !item.pass);
  const report = {
    packageId: manifest.packageId,
    checkedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    deploymentId: sitemap.headers["x-deployment-id"] ?? null,
    summary: {
      canonical: { passed: canonical.filter((item) => item.pass).length, total: canonical.length },
      redirects: { passed: redirects.filter((item) => item.pass).length, total: redirects.length },
      retired: { passed: retired.filter((item) => item.pass).length, total: retired.length },
      failures: failed.length,
    },
    canonical,
    redirects,
    retired,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`RENM soft-404 acceptance — ${report.checkedAt}\n`);
    process.stdout.write(`Target: ${options.baseUrl}\n`);
    process.stdout.write(`Deployment: ${report.deploymentId ?? "unknown"}\n\n`);
    for (const item of all) {
      if (item.pass && !options.verbose) continue;
      process.stdout.write(`${item.pass ? "PASS" : "FAIL"} ${item.kind} ${item.path}`);
      if (item.target) process.stdout.write(` -> ${item.target}`);
      process.stdout.write("\n");
      for (const error of item.errors) process.stdout.write(`  - ${error}\n`);
    }
    process.stdout.write("\n");
    process.stdout.write(
      `Canonical: ${report.summary.canonical.passed}/${report.summary.canonical.total}\n`,
    );
    process.stdout.write(
      `Redirects: ${report.summary.redirects.passed}/${report.summary.redirects.total}\n`,
    );
    process.stdout.write(
      `Retired: ${report.summary.retired.passed}/${report.summary.retired.total}\n`,
    );
    process.stdout.write(`Failures: ${report.summary.failures}\n`);
  }

  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
