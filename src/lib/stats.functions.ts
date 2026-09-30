import { createServerFn } from "@tanstack/react-start";

export type { LiveStats } from "./stats.server";

/** Null means unavailable, never a fabricated zero. No credentials leave the server. */
export const getLiveStats = createServerFn({ method: "GET" }).handler(async () => {
  const { readLiveStats } = await import("./stats.server");
  return readLiveStats();
});
