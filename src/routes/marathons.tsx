import { createFileRoute } from "@tanstack/react-router";
import { getEventsByDistance } from "@/lib/events.functions";
import { DISTANCE_PAGES } from "@/lib/distance-filters";
import {
  DistancePage,
  buildDistanceHead,
} from "@/components/distance/DistancePage";
import { SITE_URL } from "@/lib/site";

const CFG = DISTANCE_PAGES.marathon;

import { monthSearchValidator } from "@/lib/month-filter";

export const Route = createFileRoute("/marathons")({
  validateSearch: monthSearchValidator,
  loader: () => getEventsByDistance({ data: { distanceKey: "marathon" } }),
  head: ({ loaderData }) =>
    buildDistanceHead(CFG, loaderData, `/${CFG.slug}`, SITE_URL),
  component: () => <DistancePage cfg={CFG} data={Route.useLoaderData()} />,
});
