import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { DISTANCE_PAGE_LIST, type DistanceKey } from "@/lib/distance-filters";

interface DistanceNavProps {
  active?: DistanceKey;
  className?: string;
  /**
   * When set, links target the region × distance combo page
   * (`/running-events/{regionSlug}/{distance-slug}`) instead of the
   * top-level distance landing page.
   */
  regionSlug?: string;
  /**
   * Optional per-distance counts (e.g. how many events in this region).
   * Rendered as a muted "(N)" after the label when > 0.
   */
  counts?: Partial<Record<DistanceKey, number>>;
}

function PillLink({
  cfg,
  isActive,
  regionSlug,
  count,
}: {
  cfg: (typeof DISTANCE_PAGE_LIST)[number];
  isActive: boolean;
  regionSlug?: string;
  count?: number;
}) {
  const className = cn(
    "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
  );
  const aria = isActive ? ("page" as const) : undefined;
  const label = (
    <>
      {cfg.label}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "text-xs",
            isActive ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          ({count})
        </span>
      )}
    </>
  );

  const search = (prev: { month?: string }) => ({ month: prev?.month });

  if (regionSlug) {
    return (
      <Link
        to="/running-events/$slug/$distance"
        params={{ slug: regionSlug, distance: cfg.slug }}
        search={search}
        className={className}
        aria-current={aria}
      >
        {label}
      </Link>
    );
  }

  switch (cfg.key) {
    case "5k":
      return (
        <Link to="/5k-races" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
    case "10k":
      return (
        <Link to="/10k-races" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
    case "half-marathon":
      return (
        <Link to="/half-marathons" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
    case "marathon":
      return (
        <Link to="/marathons" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
    case "trail":
      return (
        <Link to="/trail-running-events" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
    case "ultra":
      return (
        <Link to="/ultra-marathons" search={search} className={className} aria-current={aria}>
          {label}
        </Link>
      );
  }
}

export function DistanceNav({
  active,
  className,
  regionSlug,
  counts,
}: DistanceNavProps) {
  return (
    <nav
      aria-label="Browse races by distance"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {DISTANCE_PAGE_LIST.map((cfg) => (
        <PillLink
          key={cfg.key}
          cfg={cfg}
          isActive={cfg.key === active}
          regionSlug={regionSlug}
          count={counts?.[cfg.key]}
        />
      ))}
    </nav>
  );
}
