import { describe, expect, it } from "vitest";
import { isAdminPayloadValid, parseAdminPayload, sanitizeAdminSearch } from "./admin-security";

describe("admin search", () => {
  it("a comma cannot add extra filters", () => {
    expect(sanitizeAdminSearch("x,status.eq.HIDDEN")).not.toMatch(/[,.]/);
  });
});

describe("admin session", () => {
  it("rejects sessions issued before the latest sign-out", () => {
    const p = parseAdminPayload("1000000000000-9000000000000");
    expect(p).not.toBeNull();
    expect(isAdminPayloadValid(p!, 2000000000000, 1500000000000)).toBe(false);
    expect(isAdminPayloadValid(p!, 2000000000000, 500000000000)).toBe(true);
  });
  it("rejects legacy expiry-only cookies", () => {
    expect(parseAdminPayload("9000000000000")).toBeNull();
  });
});
