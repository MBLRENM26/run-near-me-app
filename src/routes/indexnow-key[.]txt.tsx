import { createFileRoute } from "@tanstack/react-router";

// IndexNow ownership proof. Search engines fetch this file (passed as
// keyLocation) and check it contains the key we submit with.
export const Route = createFileRoute("/indexnow-key.txt")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.INDEXNOW_KEY;
        if (!key) return new Response("Not found", { status: 404 });
        return new Response(key, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
