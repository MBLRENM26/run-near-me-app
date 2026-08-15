/**
 * "Where to go next" — reviewed outbound destination panel (RENM showcase).
 *
 * Server-rendered, semantic and fail-closed: it only ever receives the
 * reviewed destination manifest derived on the server, so it asserts nothing
 * beyond what a human reviewed. Role + provider are visible before the click.
 *
 * Layout: one dominant primary action (~30% of the width on desktop) with the
 * remaining reviewed destinations in a compact secondary grid. After the
 * occurrence has passed, the entry action is suppressed and a non-clickable
 * "Race completed / Results coming soon" status takes the primary position
 * unless an exact reviewed results destination exists.
 */

import { ExternalLink } from "lucide-react";
import { resolvePanelLayout, type PublicDestination } from "@/lib/pilot-destinations";

function DestinationMeta({ destination }: { destination: PublicDestination }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {destination.roleLabel}
        <span className="sr-only"> destination</span>
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{destination.provider}</p>
    </>
  );
}

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
      aria-labelledby="where-to-go-next"
      className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6"
    >
      <h2 id="where-to-go-next" className="text-base font-semibold text-foreground sm:text-lg">
        Where to go next
      </h2>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Dominant primary slot — ~30% on desktop */}
        {(primary || awaitingResults) && (
          <div className="lg:w-[30%] lg:shrink-0">
            {primary ? (
              <div className="flex h-full flex-col rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
                <DestinationMeta destination={primary} />
                <a
                  href={primary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelect?.(primary)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span>{primary.action}</span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                {primary.supportingText && (
                  <p className="mt-2 text-sm text-muted-foreground">{primary.supportingText}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{primary.host}</p>
              </div>
            ) : (
              <div
                className="flex h-full flex-col justify-center rounded-xl border border-border bg-muted/40 p-4"
                role="status"
              >
                <p className="text-base font-semibold text-foreground">Race completed</p>
                <p className="mt-1 text-sm text-muted-foreground">Results coming soon</p>
              </div>
            )}
          </div>
        )}

        {/* Compact secondary grid — two columns where there is room */}
        {secondary.length > 0 && (
          <ul className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {secondary.map((d) => (
              <li
                key={`${d.role}-${d.href}`}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <DestinationMeta destination={d} />
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelect?.(d)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span>{d.action}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                {d.supportingText && (
                  <p className="mt-1 text-sm text-muted-foreground">{d.supportingText}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{d.host}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
