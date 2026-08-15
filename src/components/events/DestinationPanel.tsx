/**
 * "Race links" — reviewed outbound signpost strip (RENM showcase).
 *
 * Server-rendered, semantic and fail-closed: it only ever receives the
 * reviewed destination manifest derived on the server, so it asserts nothing
 * beyond what a human reviewed.
 *
 * Visual model: signposts, not information cards. One short visible label per
 * destination; role, provider and host context is retained in the accessible
 * name and in the unchanged analytics payload, not on the visual surface.
 *
 * Geometry is count-aware: a filled primary plus 1–4 equal-height, equal-shape
 * secondary signposts, never leaving a blank-looking slot. After the occurrence
 * has passed, the entry action is suppressed and a compact non-clickable
 * "Race completed / Results coming soon" status takes the primary position
 * unless an exact reviewed results destination exists.
 */

import { ArrowUpRight } from "lucide-react";
import {
  destinationAccessibleName,
  destinationLabel,
  resolvePanelLayout,
  secondaryGridClass,
  type PublicDestination,
} from "@/lib/pilot-destinations";

export function DestinationPanel({
  destinations,
  isPast = false,
  onSelect,
}: {
  destinations: PublicDestination[];
  /** True when the occurrence date has passed. Passed explicitly by the event page. */
  isPast?: boolean;
  onSelect?: (destination: PublicDestination) => void;
}) {
  if (destinations.length === 0) return null;

  const { primary, secondary, awaitingResults } = resolvePanelLayout(destinations, { isPast });
  if (!primary && !awaitingResults && secondary.length === 0) return null;

  return (
    <section
      aria-labelledby="race-links"
      className="mt-8 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 sm:px-5 sm:py-4"
    >
      <h2
        id="race-links"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Race links
      </h2>

      <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        {(primary || awaitingResults) && (
          <div className="sm:w-[38%] lg:w-[26%] sm:shrink-0">
            {primary ? (
              <a
                href={primary.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSelect?.(primary)}
                aria-label={destinationAccessibleName(primary)}
                className="flex h-full min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span>{destinationLabel(primary)}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <div
                className="flex h-full min-h-11 w-full flex-col items-center justify-center rounded-lg border border-border bg-muted/50 px-3 text-center"
                role="status"
              >
                <span className="text-sm font-semibold text-foreground">Race completed</span>
                <span className="text-xs text-muted-foreground">Results coming soon</span>
              </div>
            )}
          </div>
        )}

        {secondary.length > 0 && (
          <ul
            className={`grid flex-1 gap-2.5 ${secondaryGridClass(secondary.length)}`}
            data-secondary-count={secondary.length}
          >
            {secondary.map((d) => (
              <li key={`${d.role}-${d.href}`} className="min-w-0">
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelect?.(d)}
                  aria-label={destinationAccessibleName(d)}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-center text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="truncate">{destinationLabel(d)}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
