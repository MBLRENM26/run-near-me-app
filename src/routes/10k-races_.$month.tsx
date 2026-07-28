import { createFileRoute, notFound } from "@tanstack/react-router";
import { getEventsForMonth } from "@/lib/month-page.functions";
import { MonthPage, buildMonthHead } from "@/components/month/MonthPage";
import { parseMonthSlug } from "@/lib/month-slug";

export const Route = createFileRoute("/10k-races_/$month")({
  beforeLoad: ({ params }) => {
    if (!parseMonthSlug(params.month)) throw notFound();
  },
  loader: async ({ params }) => {
    const m = parseMonthSlug(params.month)!;
    return await getEventsForMonth({
      data: { monthKey: m.key, distanceKey: "10k" },
    });
  },
  head: ({ params, loaderData }) =>
    loaderData
      ? buildMonthHead(loaderData, `/10k-races/${params.month}`, "10k")
      : { meta: [{ title: "10K Races" }] },
  component: () => <MonthPage data={Route.useLoaderData()} distanceKey="10k" />,
});
