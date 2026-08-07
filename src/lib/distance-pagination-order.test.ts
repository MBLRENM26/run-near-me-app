import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * L3B-5A regression: the national distance query is fetched in 1,000-row
 * pages, so sort_date alone is not a total order. The stable id tie-breaker
 * prevents duplicate/omitted rows at page boundaries.
 */
const source = readFileSync(
  new URL("./events.functions.ts", import.meta.url),
  "utf8",
);

const start = source.indexOf("export const getEventsByDistance");
const end = source.indexOf("// ----- Region × distance combo pages -----");
const distanceSource = source.slice(start, end);

describe("distance pagination ordering (L3B-5A)", () => {
  it("isolates the intended distance-query source section", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
  });

  it("retains the base-table source during the stabilization package", () => {
    expect(distanceSource).toContain('.from("events")');
    expect(distanceSource).toContain('.eq("status", "ACTIVE")');
  });

  it("orders by id after sort_date", () => {
    const sortDateOrder = distanceSource.indexOf(
      '.order("sort_date", { ascending: true, nullsFirst: false })',
    );
    const idOrder = distanceSource.indexOf(
      '.order("id", { ascending: true })',
    );

    expect(sortDateOrder).toBeGreaterThanOrEqual(0);
    expect(idOrder).toBeGreaterThan(sortDateOrder);
  });

  it("applies both orders before the paginated range", () => {
    const idOrder = distanceSource.indexOf(
      '.order("id", { ascending: true })',
    );
    const range = distanceSource.indexOf(".range(from, to)");

    expect(range).toBeGreaterThan(idOrder);
  });
});
