import { createFileRoute } from "@tanstack/react-router";
import { getEventsForWeekend } from "@/lib/weekend.functions";
import { WeekendPage, buildWeekendHead } from "@/components/weekend/WeekendPage";

export const Route = createFileRoute("/running-events-next-weekend")({
  loader: () => getEventsForWeekend({ data: { which: "next" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildWeekendHead("next", loaderData)
      : { meta: [{ title: "Running Events Next Weekend" }] },
  component: () => <WeekendPage which="next" data={Route.useLoaderData()} />,
});
