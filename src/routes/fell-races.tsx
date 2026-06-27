import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTerrain } from "@/lib/terrain.functions";
import {
  TerrainHubPage,
  buildTerrainHubHead,
  type TerrainHubConfig,
} from "@/components/terrain/TerrainHubPage";
import { FELL_COPY } from "@/content/terrain-copy";
import { CURRENT_YEAR } from "@/lib/site";

const CFG: TerrainHubConfig = {
  slug: "fell-races",
  h1: `Fell Races in the UK ${CURRENT_YEAR}`,
  noun: "fell race",
  nounPlural: "fell races",
  metaTitle: (total) =>
    `Fell Races in the UK ${CURRENT_YEAR} — ${total.toLocaleString()} Upcoming | Running Events Near Me`,
  metaDescription: (total) =>
    `Find ${total.toLocaleString()} upcoming UK fell races — Lake District, Peak District, Yorkshire, Wales and Scotland. Categories, kit, dates and entry details.`,
  copy: FELL_COPY,
};

export const Route = createFileRoute("/fell-races")({
  loader: () => getEventsByTerrain({ data: { terrain: "fell" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildTerrainHubHead(CFG, loaderData)
      : { meta: [{ title: CFG.h1 }] },
  component: () => <TerrainHubPage cfg={CFG} data={Route.useLoaderData()} />,
});
