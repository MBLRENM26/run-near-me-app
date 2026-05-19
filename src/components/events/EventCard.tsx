import { Calendar, MapPin, Tag, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/distance";
import { cn } from "@/lib/utils";

export interface EventCardData {
  id: string;
  name: string;
  date_raw: string | null;
  town: string | null;
  county: string | null;
  distance_type: string | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  source_url: string | null;
  is_featured: boolean;
  distanceMiles?: number;
}

const NON_FEE = new Set(["", "free", "tbc", "0", "n/a", "na"]);

function pickViewUrl(e: EventCardData): string | null {
  for (const u of [e.entry_url, e.organiser_url, e.source_url]) {
    const v = u?.trim();
    if (v) return v;
  }
  return null;
}

function pickFee(fee: string | null): string | null {
  if (!fee) return null;
  const trimmed = fee.trim();
  if (NON_FEE.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function EventCard({ event }: { event: EventCardData }) {
  const viewUrl = pickViewUrl(event);
  const fee = pickFee(event.entry_fee);

  return (
    <article
      className={cn(
        "group rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 transition-all duration-200",
        "shadow-card hover:shadow-card-hover hover:-translate-y-0.5",
        event.is_featured && "ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-lg text-foreground leading-snug">
          {event.name}
        </h3>
        {event.is_featured && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        {event.date_raw && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{event.date_raw}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            {[event.town, event.county].filter(Boolean).join(", ") || "UK"}
            {event.distanceMiles !== undefined && (
              <span className="text-foreground font-medium">
                {" "}
                · {formatDistance(event.distanceMiles)}
              </span>
            )}
          </span>
        </div>
        {event.distance_type && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0" />
            <span>{event.distance_type}</span>
          </div>
        )}
      </div>

      {(fee || viewUrl) && (
        <div className="mt-auto flex items-center justify-between pt-2">
          {fee ? (
            <span className="text-sm font-medium text-foreground">{fee}</span>
          ) : (
            <span />
          )}
          {viewUrl && (
            <Button asChild size="sm" variant="default">
              <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                View event
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
