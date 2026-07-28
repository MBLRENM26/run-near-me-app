import { createFileRoute, notFound } from "@tanstack/react-router";
import { getEventsForMonth } from "@/lib/month-page.functions";
import { MonthPage, buildMonthHead } from "@/components/month/MonthPage";
import { parseMonthSlug } from "@/lib/month-slug";

export const Route = createFileRoute("/half-marathons_/$month")({
  beforeLoad: ({ params }) => {
    if (!parseMonthSlug(params.month)) throw notFound();
  },
  loader: async ({ params }) => {
    const m = parseMonthSlug(params.month)!;
    return await getEventsForMonth({
      data: { monthKey: m.key, distanceKey: "half-marathon" },
    });
  },
  head: ({ params, loaderData }) =>
    loaderData
      ? buildMonthHead(loaderData, `/half-marathons/${params.month}`, "half-marathon")
      : { meta: [{ title: "Half Marathons" }] },
  component: () => (
    <MonthPage data={Route.useLoaderData()} distanceKey="half-marathon" />
  ),
});
