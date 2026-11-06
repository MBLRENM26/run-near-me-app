import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/hooks/check-coverage")({
  server: { handlers: { POST: async ({ request }) => {
    const secret = process.env.IMPORT_SECRET;
    const provided = request.headers.get("x-admin-secret");
    if (!secret || !provided) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const expected = createHmac("sha256", secret).update(secret).digest();
    const actual = createHmac("sha256", secret).update(provided).digest();
    if (!timingSafeEqual(expected, actual)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const { runCoverageCheck } = await import("@/lib/coverage-monitor.server");
      return Response.json(await runCoverageCheck());
    } catch {
      return Response.json({ error: "Coverage check failed" }, { status: 500 });
    }
  } } },
});