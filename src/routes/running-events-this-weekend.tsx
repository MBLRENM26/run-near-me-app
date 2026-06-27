import { createFileRoute } from "@tanstack/react-router";
import { getEventsForWeekend } from "@/lib/weekend.functions";
import { WeekendPage, buildWeekendHead } from "@/components/weekend/WeekendPage";

export const Route = createFileRoute("/running-events-this-weekend")({
  loader: () => getEventsForWeekend({ data: { which: "this" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildWeekendHead("this", loaderData)
      : { meta: [{ title: "Running Events This Weekend" }] },
  component: () => <WeekendPage which="this" data={Route.useLoaderData()} />,
});
