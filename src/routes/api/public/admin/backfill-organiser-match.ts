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

// One-off backfill: match scraped events (england-athletics, scottish-,
// welsh-, ni-athletics, runabc) to a canonical clubs row and populate
// events.organiser_club_id + events.organiser. Deterministic fuzzy
// match — safe to re-run (guards on organiser_club_id IS NULL).
//
// Query params:
//   dryRun=1     — compute matches but don't write.
//   limit=N      — cap rows scanned (for smoke tests).
export const Route = createFileRoute(
  "/api/public/admin/backfill-organiser-match",
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

        const u = new URL(request.url);
        const dryRun = u.searchParams.get("dryRun") === "1";
        const limitRaw = u.searchParams.get("limit");
        const limit = limitRaw ? Math.max(1, Number(limitRaw)) : undefined;

        try {
          const { runBackfillOrganiserMatch } = await import(
            "@/lib/backfill-organiser-match.server"
          );
          const result = await runBackfillOrganiserMatch({ dryRun, limit });
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
