import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTerrain } from "@/lib/terrain.functions";
import {
  TerrainHubPage,
  buildTerrainHubHead,
  type TerrainHubConfig,
} from "@/components/terrain/TerrainHubPage";
import { MULTI_TERRAIN_COPY } from "@/content/terrain-copy";
import { CURRENT_YEAR } from "@/lib/site";

const CFG: TerrainHubConfig = {
  slug: "multi-terrain-races",
  h1: `Multi-Terrain Races in the UK ${CURRENT_YEAR}`,
  noun: "multi-terrain race",
  nounPlural: "multi-terrain races",
  metaTitle: (total) =>
    `Multi-Terrain Races in the UK ${CURRENT_YEAR} — ${total.toLocaleString()} Upcoming | Running Events Near Me`,
  metaDescription: (total) =>
    `Browse ${total.toLocaleString()} UK multi-terrain races — mixed road, trail and grass courses. Dates, distances and entry links.`,
  copy: MULTI_TERRAIN_COPY,
};

export const Route = createFileRoute("/multi-terrain-races")({
  loader: () => getEventsByTerrain({ data: { terrain: "multi-terrain" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildTerrainHubHead(CFG, loaderData)
      : { meta: [{ title: CFG.h1 }] },
  component: () => <TerrainHubPage cfg={CFG} data={Route.useLoaderData()} />,
});
