import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTerrain } from "@/lib/terrain.functions";
import {
  TerrainHubPage,
  buildTerrainHubHead,
  type TerrainHubConfig,
} from "@/components/terrain/TerrainHubPage";
import { ROAD_COPY } from "@/content/terrain-copy";
import { CURRENT_YEAR } from "@/lib/site";

const CFG: TerrainHubConfig = {
  slug: "road-races",
  h1: `Road Races in the UK ${CURRENT_YEAR}`,
  noun: "road race",
  nounPlural: "road races",
  metaTitle: (total) =>
    `Road Races in the UK ${CURRENT_YEAR} — ${total.toLocaleString()} Upcoming | Running Events Near Me`,
  metaDescription: (total) =>
    `Browse ${total.toLocaleString()} upcoming UK road races — 5K, 10K, half marathons, marathons. Dates, distances, entry links and venue details.`,
  copy: ROAD_COPY,
};

export const Route = createFileRoute("/road-races")({
  loader: () => getEventsByTerrain({ data: { terrain: "road" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildTerrainHubHead(CFG, loaderData)
      : { meta: [{ title: CFG.h1 }] },
  component: () => <TerrainHubPage cfg={CFG} data={Route.useLoaderData()} />,
});
