import { createFileRoute } from "@tanstack/react-router";
import { importEvents } from "@/lib/event-import.server";

export const Route = createFileRoute("/api/public/import-events")({
  server: { handlers: { POST: ({ request }) => importEvents(request) } },
});
