import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTaxonomy } from "@/lib/events.functions";
import { taxonomyPageBySlug } from "@/lib/taxonomy-pages";
import { monthSearchValidator } from "@/lib/month-filter";
import {
  TaxonomyLandingPage,
  buildTaxonomyHead,
} from "@/components/taxonomy/TaxonomyLandingPage";

const CFG = taxonomyPageBySlug("scottish-athletics-permitted-races")!;

export const Route = createFileRoute("/scottish-athletics-permitted-races")({
  validateSearch: monthSearchValidator,
  loader: () =>
    getEventsByTaxonomy({ data: { field: CFG.field, value: CFG.value } }),
  head: ({ loaderData }) => buildTaxonomyHead(CFG, loaderData),
  component: () => (
    <TaxonomyLandingPage cfg={CFG} data={Route.useLoaderData()} />
  ),
});
