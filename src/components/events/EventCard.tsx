import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Tag, Star, ArrowRight, Repeat } from "lucide-react";
import { formatDistance } from "@/lib/distance";
import { cn } from "@/lib/utils";
import { getEventImage } from "@/lib/event-images";

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
  // Organiser-cleared photo — currently shown on featured cards only.
  const photo = event.is_featured ? getEventImage(event.slug) : null;

  return (
    <article
      className={cn(
        "group rounded-2xl bg-card border border-border flex flex-col gap-3 transition-all duration-200 overflow-hidden",
        "shadow-card hover:shadow-card-hover hover:-translate-y-0.5",
        event.is_featured
          ? "border-primary/40 ring-2 ring-primary/25 bg-gradient-to-b from-accent/40 to-card p-0 pb-5 shadow-card-hover"
          : "p-5",
      )}
    >
      {event.is_featured && (
        <div className="flex items-center gap-1.5 bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          <Star className="h-3.5 w-3.5 fill-current" />
          Featured race
        </div>
      )}
      <div
        className={cn(
          "flex items-start justify-between gap-2",
          event.is_featured && "px-5 pt-1",
        )}
      >
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

      <div
        className={cn(
          "space-y-1.5 text-sm text-muted-foreground",
          event.is_featured && "px-5",
        )}
      >
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

      <div
        className={cn(
          "mt-auto flex items-center justify-end pt-2",
          event.is_featured && "px-5",
        )}
      >
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
