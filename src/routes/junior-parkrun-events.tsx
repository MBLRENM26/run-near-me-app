import { createFileRoute } from "@tanstack/react-router";
import { getParkrunList } from "@/lib/parkrun.functions";
import { JUNIOR_PARKRUN_CONFIG } from "@/lib/parkrun-config";
import { ParkrunHub, buildParkrunHead } from "@/components/parkrun/ParkrunHub";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/junior-parkrun-events")({
  loader: () => getParkrunList({ data: { variant: "junior" } }),
  head: ({ loaderData }) =>
    buildParkrunHead(
      JUNIOR_PARKRUN_CONFIG,
      loaderData,
      "/junior-parkrun-events",
      SITE_URL,
      "Junior parkrun Locations in the UK — Running Events Near Me",
      `Find your nearest junior parkrun. Free, weekly 2K runs for ages 4–14 at ${loaderData?.total ?? "250+"} locations — every Sunday at 9:30am.`,
    ),
  component: () => (
    <ParkrunHub cfg={JUNIOR_PARKRUN_CONFIG} data={Route.useLoaderData()} />
  ),
});
