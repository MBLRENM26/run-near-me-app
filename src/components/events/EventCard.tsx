import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Tag, Star, ArrowRight, Repeat } from "lucide-react";
import { formatDistance } from "@/lib/distance";
import { cn } from "@/lib/utils";

export interface EventCardData {
  id: string;
  slug: string | null;
  name: string;
  date_raw: string | null;
  town: string | null;
  county: string | null;
  distance_type: string | null;
  entry_fee: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  
  is_featured: boolean;
  sort_date?: string | null;
  date_is_estimated?: boolean | null;
  is_recurring?: boolean | null;
  distanceMiles?: number;
}

export function isParkrunEvent(e: Pick<EventCardData, "name">): boolean {
  return e.name.toLowerCase().includes("parkrun");
}

function detailRoute(e: EventCardData): "/parkrun-events/$slug" | "/events/$slug" {
  return isParkrunEvent(e) ? "/parkrun-events/$slug" : "/events/$slug";
}

export function EventCard({ event }: { event: EventCardData }) {
  const route = detailRoute(event);

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
          {event.slug ? (
            <Link
              to={route}
              params={{ slug: event.slug }}
              className="hover:text-primary transition-colors"
            >
              {event.name}
            </Link>
          ) : (
            event.name
          )}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {event.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </span>
          )}
          {event.is_recurring && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              title="This event runs on a recurring schedule — multiple dates available."
            >
              <Repeat className="h-3 w-3" />
              Recurring
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        {event.date_raw ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {event.date_raw}
              {event.date_is_estimated && (
                <span className="text-xs"> (date TBC)</span>
              )}
            </span>
          </div>
        ) : isParkrunEvent(event) ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {event.name.toLowerCase().includes("junior")
                ? "Every Sunday at 9:30am"
                : "Every Saturday at 9:00am"}
            </span>
          </div>
        ) : null}
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

      <div className="mt-auto flex items-center justify-end pt-2">
        {event.slug && (
          <Link
            to={route}
            params={{ slug: event.slug }}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}
