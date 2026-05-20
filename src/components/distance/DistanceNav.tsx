import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { DISTANCE_PAGE_LIST, type DistanceKey } from "@/lib/distance-filters";

interface DistanceNavProps {
  active?: DistanceKey;
  className?: string;
}

// Static map of distance key -> typed route path so TanStack Router can
// resolve the `to` prop against the generated route tree.
function DistanceLink({
  cfg,
  isActive,
}: {
  cfg: (typeof DISTANCE_PAGE_LIST)[number];
  isActive: boolean;
}) {
  const className = cn(
    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
  );
  const aria = isActive ? ("page" as const) : undefined;
  switch (cfg.key) {
    case "5k":
      return (
        <Link to="/5k-races" className={className} aria-current={aria}>
          {cfg.label}
        </Link>
      );
    case "10k":
      return (
        <Link to="/10k-races" className={className} aria-current={aria}>
          {cfg.label}
        </Link>
      );
    case "half-marathon":
      return (
        <Link to="/half-marathons" className={className} aria-current={aria}>
          {cfg.label}
        </Link>
      );
    case "marathon":
      return (
        <Link to="/marathons" className={className} aria-current={aria}>
          {cfg.label}
        </Link>
      );
    case "trail":
      return (
        <Link
          to="/trail-running-events"
          className={className}
          aria-current={aria}
        >
          {cfg.label}
        </Link>
      );
    case "ultra":
      return (
        <Link to="/ultra-marathons" className={className} aria-current={aria}>
          {cfg.label}
        </Link>
      );
  }
}

export function DistanceNav({ active, className }: DistanceNavProps) {
  return (
    <nav
      aria-label="Browse races by distance"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {DISTANCE_PAGE_LIST.map((cfg) => (
        <DistanceLink key={cfg.key} cfg={cfg} isActive={cfg.key === active} />
      ))}
    </nav>
  );
}
