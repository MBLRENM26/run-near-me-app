import { createFileRoute } from "@tanstack/react-router";
import { getParkrunList } from "@/lib/parkrun.functions";
import { ADULT_PARKRUN_CONFIG } from "@/lib/parkrun-config";
import { ParkrunHub, buildParkrunHead } from "@/components/parkrun/ParkrunHub";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/parkrun-events")({
  loader: () => getParkrunList({ data: { variant: "adult" } }),
  head: ({ loaderData }) =>
    buildParkrunHead(
      ADULT_PARKRUN_CONFIG,
      loaderData,
      "/parkrun-events",
      SITE_URL,
      "Parkrun Locations in the UK — Running Events Near Me",
      `Find your nearest parkrun. Free, weekly, timed 5K runs at ${loaderData?.total ?? "1,100+"} locations across the UK — every Saturday at 9am.`,
    ),
  component: () => (
    <ParkrunHub cfg={ADULT_PARKRUN_CONFIG} data={Route.useLoaderData()} />
  ),
});
