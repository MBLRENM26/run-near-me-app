/**
 * "Where to go next" — reviewed outbound destination panel (RENM pilot).
 *
 * Server-rendered, semantic and fail-closed: it only ever receives the
 * reviewed destination manifest derived on the server, so it asserts nothing
 * beyond what a human reviewed. Role + provider are visible before the click.
 */

import { ExternalLink } from "lucide-react";
import type { PublicDestination } from "@/lib/pilot-destinations";

export function DestinationPanel({
  destinations,
  onSelect,
}: {
  destinations: PublicDestination[];
  onSelect?: (destination: PublicDestination) => void;
}) {
  if (destinations.length === 0) return null;

  return (
    <section
      aria-labelledby="where-to-go-next"
      className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6"
    >
      <h2
        id="where-to-go-next"
        className="text-base font-semibold text-foreground sm:text-lg"
      >
        Where to go next
      </h2>
      <ul className="mt-4 space-y-3">
        {destinations.map((d) => (
          <li
            key={`${d.role}-${d.href}`}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {d.roleLabel}
              <span className="sr-only"> destination</span>
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {d.provider}
            </p>
            <a
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSelect?.(d)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              <span>{d.action}</span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {d.supportingText && (
              <p className="mt-2 text-sm text-muted-foreground">
                {d.supportingText}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{d.host}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
