import { describe, expect, it } from "vitest";
import { getEventImage } from "./event-images";

describe("getEventImage", () => {
  it("returns the cleared photo for Peninsula 13.1 editions", () => {
    const photo = getEventImage("peninsula-13-1-2026-11-15");
    expect(photo).not.toBeNull();
    expect(photo?.image).toContain("peninsula");
    expect(photo?.alt).toMatch(/Peninsula 13\.1/);
  });

  it("returns null for unknown or missing slugs", () => {
    expect(getEventImage("some-other-race-2026-01-01")).toBeNull();
    expect(getEventImage(null)).toBeNull();
    expect(getEventImage(undefined)).toBeNull();
  });
});
