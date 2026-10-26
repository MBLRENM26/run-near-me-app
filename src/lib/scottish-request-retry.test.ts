import { describe, expect, it, vi, type Mock } from "vitest";
import { requestScottishPage } from "./scottish-request-retry";

function setup(fetcher: Mock<typeof fetch>) {
  return {
    fetch: fetcher,
    sleep: vi.fn(async (_ms: number) => {}),
    timeout: vi.fn((_ms: number) => new AbortController().signal),
  };
}

describe("Scottish page retries", () => {
  it("allows 30 seconds per attempt", async () => {
    const deps = setup(vi.fn().mockResolvedValue(new Response("[]")));
    await requestScottishPage("https://example.org", {}, deps);
    expect(deps.timeout).toHaveBeenCalledWith(30_000);
  });

  it("makes three retries, then surfaces a persistent timeout", async () => {
    const error = new DOMException("Timed out", "TimeoutError");
    const deps = setup(vi.fn().mockRejectedValue(error));
    await expect(requestScottishPage("https://example.org", {}, deps)).rejects.toBe(error);
    expect(deps.fetch).toHaveBeenCalledTimes(4);
    expect(deps.sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it.each([429, 500, 503])("recovers after temporary HTTP %s", async (status) => {
    const deps = setup(vi.fn().mockResolvedValueOnce(new Response("busy", { status }))
      .mockResolvedValueOnce(new Response('[{"event":"race"}]')));
    await expect(requestScottishPage("https://example.org", {}, deps)).resolves.toEqual([{ event: "race" }]);
    expect(deps.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent HTTP failure", async () => {
    const deps = setup(vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
    await expect(requestScottishPage("https://example.org", {}, deps)).rejects.toThrow("403");
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry malformed data or mistake it for an empty calendar", async () => {
    const deps = setup(vi.fn().mockResolvedValue(new Response("not JSON")));
    await expect(requestScottishPage("https://example.org", {}, deps)).rejects.toThrow();
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses a fresh signal and preserves the page request on network retry", async () => {
    const deps = setup(vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("[]")));
    await requestScottishPage("https://example.org", { method: "POST", body: "page=2" }, deps);
    expect(deps.fetch.mock.calls.map((call) => call[1].body)).toEqual(["page=2", "page=2"]);
    expect(deps.fetch.mock.calls[0][1].signal).not.toBe(deps.fetch.mock.calls[1][1].signal);
  });
});