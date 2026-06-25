// Public server function: subscribe an email to a race reminder.
// Idempotent per (email, event_id, 'reminder'); sends a confirmation email
// on first signup. No auth required — anti-abuse is enforced by zod
// validation + a unique constraint at the DB level.

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { formatEventDate } from '@/lib/date'
import { SITE_URL } from '@/lib/site'

const inputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.')
    .max(255),
  eventId: z.string().uuid('Invalid event reference.'),
})

export const subscribeToRaceReminder = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; alreadySubscribed: boolean }> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendRaceEmail } = await import('@/lib/race-email.server')

    // Look up event for confirmation email content + sanity check it exists
    // and is still active/upcoming.
    const { data: event, error: eventErr } = await (supabaseAdmin as any)
      .from('events')
      .select(
        'id, slug, name, town, county, sort_date, date_from, date_to, date_raw, date_is_estimated, status',
      )
      .eq('id', data.eventId)
      .maybeSingle()
    if (eventErr) throw new Error(eventErr.message)
    if (!event || event.status !== 'ACTIVE') {
      throw new Error('Event not found.')
    }
    const today = new Date().toISOString().slice(0, 10)
    if (event.sort_date && event.sort_date < today) {
      throw new Error("That race has already taken place.")
    }

    // Idempotent insert: rely on the unique (email, event_id, kind) constraint.
    const { error: insertErr } = await (supabaseAdmin as any)
      .from('email_subscriptions')
      .insert({
        email: data.email,
        event_id: data.eventId,
        kind: 'reminder',
      })

    let alreadySubscribed = false
    if (insertErr) {
      // 23505 = unique_violation — already signed up. That's a success state
      // from the user's POV; don't resend confirmation.
      if ((insertErr as any).code === '23505') {
        alreadySubscribed = true
      } else {
        throw new Error(insertErr.message)
      }
    }

    if (!alreadySubscribed) {
      const dateLabel = formatEventDate({
        date_from: event.date_from,
        date_to: event.date_to,
        sort_date: event.sort_date,
        date_raw: event.date_raw,
        date_is_estimated: event.date_is_estimated,
      })
      const location =
        [event.town, event.county].filter(Boolean).join(', ') || null
      await sendRaceEmail({
        templateName: 'race-reminder-confirmation',
        recipientEmail: data.email,
        idempotencyKey: `race-reminder-confirm-${event.id}-${data.email}`,
        templateData: {
          eventName: event.name,
          eventDate: dateLabel || null,
          eventLocation: location,
          eventUrl: event.slug ? `${SITE_URL}/events/${event.slug}` : SITE_URL,
        },
      })
    }

    return { ok: true, alreadySubscribed }
  })
