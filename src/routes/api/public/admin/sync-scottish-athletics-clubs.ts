import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

export const Route = createFileRoute(
  "/api/public/admin/sync-scottish-athletics-clubs",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        const provided = request.headers.get("x-admin-secret");
        let authorized = false;
        if (provided) {
          const a = Buffer.from(provided);
          const b = Buffer.from(expected);
          if (a.length === b.length) {
            try {
              authorized = timingSafeEqual(a, b);
            } catch {
              authorized = false;
            }
          }
        }
        if (!authorized) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const { runScottishAthleticsClubsSync } = await import(
            "@/lib/sync-scottish-athletics-clubs.server"
          );
          const result = await runScottishAthleticsClubsSync();
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
