import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Renders a "Back to search results for …" chip above the breadcrumb when
 * the current URL carries `?from=search&fromQ=…`. Self-contained — reads
 * the search params off the current route via `useSearch({ strict: false })`,
 * so it works on any page that retains the pair in its `validateSearch`.
 */
export function BackToSearchBar() {
  const search = useSearch({ strict: false }) as {
    from?: string;
    fromQ?: string;
  };

  if (search.from !== "search" || !search.fromQ) return null;
  const q = search.fromQ;

  return (
    <div className="mb-3">
      <Link
        to="/search"
        search={{ q }}
        onClick={() => track("Back to search clicked", { q })}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to search results for "{q}"
      </Link>
    </div>
  );
}
