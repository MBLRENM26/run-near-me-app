import peninsula131Hero from "@/assets/peninsula-13-1-hero.jpg";

/**
 * Organiser-cleared, event-specific photos.
 *
 * Only imagery supplied/cleared by the event's own organiser belongs here.
 * Keyed by slug prefix so future editions of the same race inherit the photo.
 * To roll back an individual photo, delete its entry; to roll back the whole
 * capability, remove this file and the EventCard import.
 */
const EVENT_IMAGES: ReadonlyArray<{
  slugPrefix: string;
  image: string;
  alt: string;
}> = [
  {
    slugPrefix: "peninsula-13-1-",
    image: peninsula131Hero,
    alt: "Runner on the Thames-side trail at dawn on the Peninsula 13.1 course",
  },
];

export interface EventImage {
  image: string;
  alt: string;
}

export function getEventImage(
  slug: string | null | undefined,
): EventImage | null {
  if (!slug) return null;
  return EVENT_IMAGES.find((e) => slug.startsWith(e.slugPrefix)) ?? null;
}
