import { createFileRoute } from "@tanstack/react-router";
import { getEventsByTerrain } from "@/lib/terrain.functions";
import {
  TerrainHubPage,
  buildTerrainHubHead,
  type TerrainHubConfig,
} from "@/components/terrain/TerrainHubPage";
import { TRAIL_COPY } from "@/content/terrain-copy";
import { CURRENT_YEAR } from "@/lib/site";

const CFG: TerrainHubConfig = {
  slug: "trail-running-events",
  h1: `Trail Running Events in the UK ${CURRENT_YEAR}`,
  noun: "trail running event",
  nounPlural: "trail running events",
  metaTitle: (total) =>
    `Trail Running Events in the UK ${CURRENT_YEAR} — ${total.toLocaleString()} Upcoming | Running Events Near Me`,
  metaDescription: (total) =>
    `Find ${total.toLocaleString()} upcoming UK trail running events — woodland, moorland, coast and mountain. Waymarked courses, distances and entry details.`,
  copy: TRAIL_COPY,
};

export const Route = createFileRoute("/trail-running-events")({
  loader: () => getEventsByTerrain({ data: { terrain: "trail" } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildTerrainHubHead(CFG, loaderData)
      : { meta: [{ title: CFG.h1 }] },
  component: () => <TerrainHubPage cfg={CFG} data={Route.useLoaderData()} />,
});
