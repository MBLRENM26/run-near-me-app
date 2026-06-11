import { createFileRoute } from "@tanstack/react-router";

// Legacy URL that leaked into Google's index. Never a valid TanStack Start
// path — 301 to home.
export const Route = createFileRoute("/index.html")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(null, {
          status: 301,
          headers: { Location: "/" },
        });
      },
    },
  },
});
