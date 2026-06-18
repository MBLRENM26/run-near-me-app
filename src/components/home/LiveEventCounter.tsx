import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getLiveStats } from "@/lib/stats.functions";

const LIVE_STATS_KEY = ["live-stats"] as const;
export const liveStatsQueryOptions = {
  queryKey: LIVE_STATS_KEY,
  queryFn: () => getLiveStats(),
  // Refetch every 60s so the number visibly ticks during a session if cron
  // publishes new events or an admin flips a hidden one live.
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  staleTime: 30_000,
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, durationMs = 800) {
  const [display, setDisplay] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const from = previousRef.current;
    const to = target;
    if (from === to) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(to);
      previousRef.current = to;
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else previousRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

export function LiveEventCounter() {
  const { data } = useSuspenseQuery(liveStatsQueryOptions);
  const value = useCountUp(data.activeEvents);
  const formatted = value.toLocaleString("en-GB");

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground"
      aria-live="polite"
    >
      <span
        className="relative flex h-2 w-2"
        aria-hidden="true"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="font-semibold tabular-nums text-foreground">
        {formatted}
      </span>
      <span>UK races live right now</span>
    </div>
  );
}
