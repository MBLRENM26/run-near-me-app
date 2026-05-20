import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  DISTANCE_PAGE_LIST,
  type DistanceKey,
} from "@/lib/distance-filters";

interface DistanceNavProps {
  active?: DistanceKey;
  className?: string;
}

export function DistanceNav({ active, className }: DistanceNavProps) {
  return (
    <nav
      aria-label="Browse races by distance"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {DISTANCE_PAGE_LIST.map((p) => {
        const isActive = p.key === active;
        return (
          <Link
            key={p.key}
            to={`/${p.slug}`}
            className={cn(
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
