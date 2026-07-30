// Daily cron endpoint: emails everyone whose race is ~7 days out.
// Triggered by pg_cron via pg_net at 09:00 UTC. Auth: x-admin-secret == IMPORT_SECRET.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendRaceEmail } from "@/lib/race-email.server";
import { formatEventDate } from "@/lib/date";
import { SITE_URL } from "@/lib/site";
import {
  isReminderSendingEnabled,
  reminderDisabledResponse,
} from "@/lib/reminder-gate";

interface SubscriptionRow {
  id: string;
  email: string;
  event_id: string;
  events:
    | {
        id: string;
        slug: string | null;
        name: string;
        town: string | null;
        county: string | null;
        sort_date: string | null;
        date_from: string | null;
        date_to: string | null;
        date_raw: string | null;
        date_is_estimated: boolean | null;
        status: string;
      }
    | null;
}

export const Route = createFileRoute(
  "/api/public/hooks/send-race-reminders",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Containment gate: fail closed before auth, DB reads or any side effect.
        if (!isReminderSendingEnabled(process.env.REMINDER_SENDING_ENABLED)) {
          return reminderDisabledResponse();
        }

        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        const provided = request.headers.get("x-admin-secret");
        if (!provided || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 7-day window — catches a race once on the day the cron runs.
        const today = new Date();
        const target = new Date(today);
        target.setUTCDate(target.getUTCDate() + 7);
        const targetDate = target.toISOString().slice(0, 10);

        const supabase: any = supabaseAdmin;
        const { data, error } = await supabase
          .from("email_subscriptions")
          .select(
            `id, email, event_id,
             events:event_id(id, slug, name, town, county, sort_date,
                            date_from, date_to, date_raw, date_is_estimated, status)`,
          )
          .is("reminder_sent_at", null)
          .eq("kind", "reminder");
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const rows = (data ?? []) as SubscriptionRow[];
        const due = rows.filter(
          (r) =>
            r.events &&
            r.events.status === "ACTIVE" &&
            r.events.sort_date === targetDate,
        );

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const row of due) {
          const event = row.events!;
          const dateLabel = formatEventDate({
            date_from: event.date_from,
            date_to: event.date_to,
            sort_date: event.sort_date,
            date_raw: event.date_raw,
            date_is_estimated: event.date_is_estimated,
          });
          const location =
            [event.town, event.county].filter(Boolean).join(", ") || null;
          const res = await sendRaceEmail({
            templateName: "race-reminder",
            recipientEmail: row.email,
            idempotencyKey: `race-reminder-${event.id}-${row.email}`,
            templateData: {
              eventName: event.name,
              eventDate: dateLabel || null,
              eventLocation: location,
              eventUrl: event.slug
                ? `${SITE_URL}/events/${event.slug}`
                : SITE_URL,
              daysUntil: 7,
            },
          });

          // Always mark as sent so we don't retry the same row tomorrow,
          // even when the recipient is suppressed or the queue failed
          // (the email_send_log captures failures separately).
          await supabase
            .from("email_subscriptions")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", row.id);

          if (res.ok) sent++;
          else if (res.reason === "suppressed" || res.reason === "previously_unsubscribed")
            skipped++;
          else failed++;
        }

        return Response.json({
          ok: true,
          candidates: rows.length,
          due: due.length,
          sent,
          skipped,
          failed,
        });
      },
    },
  },
});
