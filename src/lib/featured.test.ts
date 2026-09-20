import { describe, it, expect } from "vitest";
import { featuredFirst } from "./featured";

describe("featuredFirst", () => {
  it("moves featured events to the front and keeps relative order", () => {
    const list = [
      { id: "a", is_featured: false },
      { id: "b", is_featured: true },
      { id: "c", is_featured: false },
      { id: "d", is_featured: true },
    ];
    expect(featuredFirst(list).map((e) => e.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("treats null/undefined as not featured and never drops rows", () => {
    const list = [{ id: "a" }, { id: "b", is_featured: null }];
    expect(featuredFirst(list).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
