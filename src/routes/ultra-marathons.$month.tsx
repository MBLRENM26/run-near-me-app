import { createFileRoute, notFound } from "@tanstack/react-router";
import { getEventsForMonth } from "@/lib/month-page.functions";
import { MonthPage, buildMonthHead } from "@/components/month/MonthPage";
import { parseMonthSlug } from "@/lib/month-slug";

export const Route = createFileRoute("/ultra-marathons/$month")({
  beforeLoad: ({ params }) => {
    if (!parseMonthSlug(params.month)) throw notFound();
  },
  loader: async ({ params }) => {
    const m = parseMonthSlug(params.month)!;
    return await getEventsForMonth({
      data: { monthKey: m.key, distanceKey: "ultra" },
    });
  },
  head: ({ params, loaderData }) =>
    loaderData
      ? buildMonthHead(loaderData, `/ultra-marathons/${params.month}`, "ultra")
      : { meta: [{ title: "Ultra Marathons" }] },
  component: () => <MonthPage data={Route.useLoaderData()} distanceKey="ultra" />,
});
