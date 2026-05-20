import { useEffect, useState, lazy, Suspense } from "react";
import type { ParkrunLocation } from "@/lib/parkrun.functions";

// Leaflet uses `window` at import time — load only on the client.
const ParkrunMap = lazy(() =>
  import("./ParkrunMap").then((m) => ({ default: m.ParkrunMap })),
);

interface Props {
  locations: ParkrunLocation[];
  height?: number;
}

export function ParkrunMapClient({ locations, height = 480 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="w-full rounded-2xl border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div
          className="w-full rounded-2xl border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground"
          style={{ height }}
        >
          Loading map…
        </div>
      }
    >
      <ParkrunMap locations={locations} height={height} />
    </Suspense>
  );
}
