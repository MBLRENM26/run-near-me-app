import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Static-source seam: the event-detail handlers run against the service-role
// client, so this asserts the projection contract at the source level —
// `licensed` is selected and projected, `source` / `source_url` stay stripped.
const source = readFileSync(
  fileURLToPath(new URL("./events.functions.ts", import.meta.url)),
  "utf8",
);

describe("event detail licence projection", () => {
  it("declares licensed on the public EventDetail type", () => {
    expect(source).toMatch(/licensed: string \| null;/);
  });

  it("selects licensed in both event-detail queries", () => {
    const selects = source.match(/governance, licensed, organiser_type/g) ?? [];
    expect(selects.length).toBe(2);
  });

  it("still strips private provenance from the public payload", () => {
    expect(source).toMatch(/source: _source,/);
    expect(source).toMatch(/source_url: _source_url,/);
  });
});
