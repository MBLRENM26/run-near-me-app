// Server-only: enqueues race-related transactional emails into the existing
// Lovable transactional email queue. Mirrors notify.server.ts shape.
// Failures are swallowed by the caller so user-facing flows never break.

import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Running Events Near Me'
const SENDER_DOMAIN = 'notify.runningeventsnearme.com'
const FROM_DOMAIN = 'runningeventsnearme.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface SendRaceEmailInput {
  templateName: 'race-reminder-confirmation' | 'race-reminder'
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
}

export async function sendRaceEmail(
  input: SendRaceEmailInput,
): Promise<{ ok: boolean; reason?: string }> {
  const { templateName, recipientEmail, idempotencyKey, templateData } = input
  const entry = TEMPLATES[templateName]
  if (!entry) {
    console.warn('[race-email] unknown template', templateName)
    return { ok: false, reason: 'unknown_template' }
  }

  const recipient = recipientEmail.trim()
  if (!recipient) return { ok: false, reason: 'empty_recipient' }
  const normalizedEmail = recipient.toLowerCase()
  const messageId = crypto.randomUUID()
  const supabase: any = supabaseAdmin

  try {
    // Suppressed addresses are skipped silently.
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (suppressed) {
      console.log('[race-email] recipient suppressed, skipping')
      return { ok: false, reason: 'suppressed' }
    }

    // Reuse-or-mint unsubscribe token for this address.
    let unsubscribeToken: string
    const { data: existingToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token
    } else if (!existingToken) {
      unsubscribeToken = generateToken()
      await supabase
        .from('email_unsubscribe_tokens')
        .upsert(
          { token: unsubscribeToken, email: normalizedEmail },
          { onConflict: 'email', ignoreDuplicates: true },
        )
      const { data: storedToken } = await supabase
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (!storedToken) {
        console.warn('[race-email] failed to confirm unsubscribe token')
        return { ok: false, reason: 'unsubscribe_token_failed' }
      }
      unsubscribeToken = storedToken.token
    } else {
      // Token exists but was used — recipient already unsubscribed.
      return { ok: false, reason: 'previously_unsubscribed' }
    }

    const element = React.createElement(entry.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof entry.subject === 'function'
        ? entry.subject(templateData)
        : entry.subject

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.warn('[race-email] failed to enqueue', enqueueError)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return { ok: false, reason: 'enqueue_failed' }
    }

    return { ok: true }
  } catch (err) {
    console.warn('[race-email] unexpected failure', err)
    return { ok: false, reason: 'exception' }
  }
}
