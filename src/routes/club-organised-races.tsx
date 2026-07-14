import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTaxonomy } from "@/lib/events.functions";
import { taxonomyPageBySlug } from "@/lib/taxonomy-pages";
import { monthSearchValidator } from "@/lib/month-filter";
import {
  TaxonomyLandingPage,
  buildTaxonomyHead,
} from "@/components/taxonomy/TaxonomyLandingPage";

const CFG = taxonomyPageBySlug("club-organised-races")!;

export const Route = createFileRoute("/club-organised-races")({
  validateSearch: monthSearchValidator,
  loader: () =>
    getEventsByTaxonomy({ data: { field: CFG.field, value: CFG.value } }),
  head: ({ loaderData }) => buildTaxonomyHead(CFG, loaderData),
  component: () => (
    <TaxonomyLandingPage cfg={CFG} data={Route.useLoaderData()} />
  ),
});
