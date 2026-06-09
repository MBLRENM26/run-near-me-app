import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normaliseRegion } from "@/lib/region-normalize";

const EventRowSchema = z.object({
  norm_id: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  slug: z.string().max(255).nullish(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  is_recurring: z.boolean().optional().default(false),
  town: z.string().max(255).nullish(),
  county: z.string().max(255).nullish(),
  country: z.string().max(255).nullish(),
  region: z.string().max(255).nullish(),
  location_raw: z.string().max(1000).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  distances: z.string().max(500).nullish(),
  discipline: z.string().max(255).nullish(),
  entry_url: z.string().max(2000).nullish(),
  organiser_url: z.string().max(2000).nullish(),
  organiser: z.string().max(500).nullish(),
  entry_fee: z.string().max(255).nullish(),
  source: z.string().max(255).nullish(),
  source_url: z.string().max(2000).nullish(),
  licensed: z
    .union([z.string().max(255), z.boolean()])
    .transform((v) => (typeof v === "boolean" ? String(v) : v))
    .nullish(),
  status: z.string().max(50).optional().default("ACTIVE"),
  date_raw: z.string().max(500).nullish(),
  norm_created_at: z.string().datetime().nullish(),
});

const PayloadSchema = z.object({
  events: z.array(EventRowSchema).min(1).max(1000),
});

export const Route = createFileRoute("/api/public/import-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return new Response(
            JSON.stringify({ error: "Server not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const provided = request.headers.get("x-import-secret");
        if (!provided || provided !== expected) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "Validation failed",
              issues: parsed.error.issues,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const rows = parsed.data.events.map((e) => ({
          ...e,
          // Normalise broad region labels ("England") to the specific UK
          // region used by regional pages, via county or coordinates.
          region: normaliseRegion(e.region, e.county, e.lat, e.lng),
          // Mirror date_from into sort_date so the existing "upcoming" sort keeps working
          sort_date: e.date_from ?? null,
          // Mark upcoming if date_from is today or later
          is_upcoming: e.date_from
            ? new Date(e.date_from) >= new Date(new Date().toDateString())
            : false,
        }));

        const { data, error } = await supabaseAdmin
          .from("events")
          .upsert(rows, { onConflict: "norm_id" })
          .select("id, norm_id");

        if (error) {
          console.error("[import-events] upsert error", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            received: parsed.data.events.length,
            written: data?.length ?? 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
