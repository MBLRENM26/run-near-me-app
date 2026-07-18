// Public server function: report a change to an existing event listing
// (postponed date, cancelled, broken link, wrong details). Lands in the
// same admin submissions queue as new-listing and claim rows, tagged as
// kind='edit' with the event_id linked so admin can jump straight to the
// event editor.
//
// No auth required. Rate-limited by (event_id, email): one NEW-status
// report per email per event at a time — the reporter sees a friendly
// "we're on it" message instead of a duplicate row.

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const CHANGE_TYPES = ['date', 'cancelled', 'link', 'details', 'other'] as const
const RELATIONSHIPS = [
  'organiser',
  'club',
  'runner',
  'other',
] as const

const inputSchema = z.object({
  event_id: z.string().uuid('Invalid event reference.'),
  change_type: z.enum(CHANGE_TYPES),
  details: z
    .string()
    .trim()
    .min(3, 'Please add a short description of what has changed.')
    .max(1000),
  proposed_new_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a valid date.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  proof_url: z
    .string()
    .trim()
    .url('Enter a full URL (starting with https://).')
    .max(1000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  reporter_name: z.string().trim().max(200).optional(),
  reporter_relationship: z.enum(RELATIONSHIPS).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.')
    .max(255),
})

export const submitEventChangeReport = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; alreadyReported: boolean; id: string | null }
      | { ok: false; reason: 'rate_limited' | 'server_error' }
    > => {
      // Layer 1: in-memory burst limiter (shared with submitListing).
      const { checkSubmissionRateLimit } = await import('@/lib/admin.functions')
      if (!checkSubmissionRateLimit()) {
        return { ok: false, reason: 'rate_limited' }
      }
      // Layer 2: durable per-UTC-bucket limiter (fail-closed on missing
      // cf-connecting-ip / missing ADMIN_SESSION_SECRET).
      const { consumeDurableSubmissionRate } = await import(
        '@/lib/submission-rate-limit.server'
      )
      const gate = await consumeDurableSubmissionRate()
      if (!gate.ok) {
        return {
          ok: false,
          reason: gate.reason === 'rate_limited' ? 'rate_limited' : 'server_error',
        }
      }

      const { supabaseAdmin } = await import(
        '@/integrations/supabase/client.server'
      )
      const { sendNewSubmissionNotification } = await import(
        '@/lib/notify.server'
      )

      // Sanity check the event exists (and grab its name for the notify email)
      const { data: event, error: eventErr } = await (supabaseAdmin as any)
        .from('events')
        .select('id, name, slug, status')
        .eq('id', data.event_id)
        .maybeSingle()
      if (eventErr) throw new Error(eventErr.message)
      if (!event) throw new Error('Event not found.')

      // Rate limit: one open (status='new') edit per (event, email).
      const { data: existing } = await (supabaseAdmin as any)
        .from('submissions')
        .select('id')
        .eq('kind', 'edit')
        .eq('event_id', data.event_id)
        .eq('email', data.email)
        .eq('status', 'new')
        .maybeSingle()
      if (existing?.id) {
        return { ok: true, alreadyReported: true, id: existing.id }
      }

      // Compose the event_details summary — the SubmissionRow admin card
      // shows this + the structured fields side-by-side.
      const summaryLines: string[] = [
        `Event: ${event.name} (${event.slug})`,
        `Change: ${data.change_type}`,
      ]
      if (data.proposed_new_date)
        summaryLines.push(`Proposed new date: ${data.proposed_new_date}`)
      if (data.proof_url) summaryLines.push(`Proof: ${data.proof_url}`)
      if (data.reporter_name)
        summaryLines.push(`Reporter: ${data.reporter_name}`)
      if (data.reporter_relationship)
        summaryLines.push(`Relationship: ${data.reporter_relationship}`)
      summaryLines.push('', 'Details:', data.details)

      const { data: inserted, error: insErr } = await (supabaseAdmin as any)
        .from('submissions')
        .insert({
          kind: 'edit',
          event_id: data.event_id,
          change_type: data.change_type,
          email: data.email,
          event_details: summaryLines.join('\n'),
          proof_url: data.proof_url ?? null,
          reporter_name: data.reporter_name ?? null,
          reporter_relationship: data.reporter_relationship ?? null,
          proposed_new_date: data.proposed_new_date ?? null,
        })
        .select('id, email, kind, submitted_at')
        .single()

      if (insErr || !inserted) {
        throw new Error(insErr?.message ?? 'Insert failed')
      }

      // Notify admin (fire-and-forget — the audit log row is written
      // synchronously inside sendNewSubmissionNotification).
      sendNewSubmissionNotification({
        id: inserted.id,
        email: inserted.email,
        kind: 'edit',
        claim_slug: event.slug,
        submitted_at: inserted.submitted_at,
      }).catch((err) =>
        console.warn('[submitEventChangeReport] notify failed', err),
      )

      return { ok: true, alreadyReported: false, id: inserted.id }
    },
  )
