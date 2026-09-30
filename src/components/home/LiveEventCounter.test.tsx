import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveEventCounter, liveStatsQueryOptions } from "./LiveEventCounter";

vi.mock("@/lib/stats.functions", () => ({ getLiveStats: vi.fn() }));
const clients: QueryClient[] = [];
const client = () => {
  // Even an app-wide throwing default must not make an optional badge fatal.
  const value = new QueryClient({
    defaultOptions: { queries: { retry: false, throwOnError: true } },
  });
  clients.push(value);
  return value;
};
const render = (queryClient: QueryClient) =>
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>Find your next race</h1>
        <LiveEventCounter />
        <a href="/search">Search races</a>
      </main>
    </QueryClientProvider>,
  );
afterEach(() => clients.splice(0).forEach((c) => c.clear()));
describe("optional homepage race count", () => {
  it("renders the page immediately while the count is unavailable", () => {
    const html = render(client());
    expect(html).toContain("Find your next race");
    expect(html).toContain("Search races");
    expect(html).not.toContain("UK races live right now");
  });
  it("keeps the page available after the initial count request rejects", async () => {
    const c = client();
    await c
      .fetchQuery({
        ...liveStatsQueryOptions,
        retry: false,
        queryFn: async () => {
          throw new Error("offline");
        },
      })
      .catch(() => {});
    const html = render(c);
    expect(html).toContain("Search races");
    expect(html).not.toContain("UK races live right now");
  });
  it("keeps a previously verified count if a background refresh fails", async () => {
    const c = client();
    c.setQueryData(liveStatsQueryOptions.queryKey, {
      activeEvents: 1234,
      updatedAt: "2026-09-30T00:00:00Z",
    });
    await c
      .fetchQuery({
        ...liveStatsQueryOptions,
        staleTime: 0,
        retry: false,
        queryFn: async () => {
          throw new Error("offline");
        },
      })
      .catch(() => {});
    expect(render(c)).toContain("1,234");
  });
  it("hides malformed counts instead of throwing or showing a fake zero", () => {
    const c = client();
    c.setQueryData(liveStatsQueryOptions.queryKey, { activeEvents: "unknown" });
    expect(render(c)).not.toContain("UK races live right now");
    c.setQueryData(liveStatsQueryOptions.queryKey, { activeEvents: 0 });
    expect(render(c)).toContain("UK races live right now");
  });
});
