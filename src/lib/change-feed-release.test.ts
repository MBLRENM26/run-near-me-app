import { describe, expect, it } from "vitest";
import { requireChangeFeedAcceptance } from "./change-feed-release";

describe("change-feed release containment", () => {
  it("blocks applying a report until atomic acceptance is ready", () => {
    expect(() => requireChangeFeedAcceptance("accepted")).toThrow("temporarily unavailable");
  });
  it("preserves review decisions that do not change race facts", () => {
    expect(() => requireChangeFeedAcceptance("rejected")).not.toThrow();
    expect(() => requireChangeFeedAcceptance("unknown")).not.toThrow();
  });
});
