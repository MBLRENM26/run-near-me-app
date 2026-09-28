import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventCardData } from "@/components/events/EventCard";
import { slugToRegion } from "@/lib/regions";

export const getEventsForRegion = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ regionSlug: z.string().refine((slug) => !!slugToRegion(slug), "Unknown region") })
      .parse(input),
  )
  .handler(async ({ data }): Promise<EventCardData[]> => {
    const { loadRegionEvents } = await import("./region-page.server");
    return loadRegionEvents(data.regionSlug);
  });
