import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type Manifest = {
  packageId: string;
  baseUrl: string;
  sourceMigration: string;
  canonicalPaths: string[];
  redirects: Array<{ from: string; to: string }>;
  retiredPaths: string[];
};

type Patch = {
  id: string;
  slug: string;
  expected: Record<string, unknown>;
  target: Record<string, unknown>;
};

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(repoRoot, "scripts/soft404-residual-acceptance-manifest.json"), "utf8"),
) as Manifest;
const migration = readFileSync(join(repoRoot, manifest.sourceMigration), "utf8");
const payloadMatch = migration.match(/\$patches\$\s*([\s\S]*?)\s*\$patches\$::jsonb/);
if (!payloadMatch) throw new Error("soft-404 migration patch payload not found");
const patches = JSON.parse(payloadMatch[1]) as Patch[];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("RENM soft-404 residual acceptance manifest", () => {
  it("covers the exact reviewed canonical, redirect and retirement cohorts", () => {
    expect(manifest.packageId).toBe("renm-soft404-residual-2026-08-13");
    expect(manifest.canonicalPaths).toHaveLength(43);
    expect(manifest.redirects).toHaveLength(13);
    expect(manifest.retiredPaths).toEqual([
      "/events/athens-authentic-marathon",
      "/events/athens-authentic-marathon-2",
    ]);

    const allPaths = [
      ...manifest.canonicalPaths,
      ...manifest.redirects.map((redirect) => redirect.from),
      ...manifest.retiredPaths,
    ];
    expect(new Set(allPaths).size).toBe(allPaths.length);
    expect(new Set(manifest.canonicalPaths).size).toBe(43);
  });

  it("ties every canonical candidate to a stable-ID migration patch", () => {
    expect(patches).toHaveLength(46);
    const patchesBySlug = new Map(patches.map((patch) => [patch.slug, patch]));
    for (const path of manifest.canonicalPaths) {
      const slug = path.split("/").pop();
      const patch = patchesBySlug.get(slug ?? "");
      expect(patch, path).toBeDefined();
      expect(patch?.id, path).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it("maps every redirect directly to a reviewed canonical candidate", () => {
    const canonical = new Set(manifest.canonicalPaths);
    for (const redirect of manifest.redirects) {
      expect(redirect.from).toMatch(/^\/events\/[a-z0-9-]+$/);
      expect(canonical.has(redirect.to), `${redirect.from} -> ${redirect.to}`).toBe(true);
      expect(redirect.from).not.toBe(redirect.to);
    }
  });

  it("contains no hard-coded retired alias links in rendered source", () => {
    const renderedSource = [join(repoRoot, "src/routes"), join(repoRoot, "src/components")]
      .flatMap(sourceFiles)
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    for (const path of [
      ...manifest.redirects.map((redirect) => redirect.from),
      ...manifest.retiredPaths,
    ]) {
      expect(renderedSource, path).not.toContain(path);
    }
  });

  it("exposes the read-only verifier as a package command", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["verify:soft404"]).toBe("node scripts/verify-soft404-residual.mjs");
  });
});
