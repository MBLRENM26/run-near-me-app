import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function isAuthorized(request: Request): boolean {
  const adminSecret = process.env.IMPORT_SECRET;
  if (!adminSecret) return false;
  const provided = request.headers.get("x-admin-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(adminSecret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute(
  "/api/public/admin/sync-england-athletics",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.IMPORT_SECRET) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Optional page range for chunked runs: ?from=1&to=30
        // Optional ?order=desc to sweep the feed in reverse.
        const u = new URL(request.url);
        const fromPage = Number(u.searchParams.get("from")) || undefined;
        const toPage = Number(u.searchParams.get("to")) || undefined;
        const order: "asc" | "desc" =
          u.searchParams.get("order") === "desc" ? "desc" : "asc";

        try {
          const { runEnglandAthleticsSync } = await import(
            "@/lib/sync-england-athletics.server"
          );
          const result = await runEnglandAthleticsSync({
            fromPage,
            toPage,
            order,
          });
          return Response.json(result);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          );
        }
      },
    },
  },
});
