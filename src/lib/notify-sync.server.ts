// Admin sync-summary email — fired at the end of each scheduled sync run.
// Failures are logged but never break the sync itself.

import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Running Events Near Me'
const SENDER_DOMAIN = 'notify.runningeventsnearme.com'
const FROM_DOMAIN = 'runningeventsnearme.com'
const TEMPLATE_NAME = 'admin-sync-summary'

export interface SyncSummaryPayload {
  syncRunId: string
  source: string
  status: 'success' | 'error' | 'partial'
  startedAt: string
  durationMs: number | null
  fetched: number | null
  active: number | null
  written: number | null
  newEvents: number | null
  updatedExisting: number | null
  skippedDupes: number | null
  skippedNoDate: number | null
  failedPages: number | null
  errorMessage: string | null
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function sendSyncSummaryNotification(
  data: SyncSummaryPayload,
): Promise<void> {
  const supabase: any = supabaseAdmin
  const messageId = `admin-sync-summary-${data.syncRunId}`

  try {
    const entry = TEMPLATES[TEMPLATE_NAME]
    if (!entry || !entry.to) {
      console.warn('[notify-sync] template missing or has no recipient')
      return
    }
    const recipient = entry.to
    const normalizedEmail = recipient.toLowerCase()

    await supabase
      .from('email_send_log')
      .upsert(
        {
          message_id: messageId,
          template_name: TEMPLATE_NAME,
          recipient_email: recipient,
          status: 'pending',
        },
        { onConflict: 'message_id', ignoreDuplicates: false },
      )

    // Suppression check
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (suppressed) {
      await supabase
        .from('email_send_log')
        .update({ status: 'suppressed' })
        .eq('message_id', messageId)
      return
    }

    // Unsubscribe token
    let unsubscribeToken: string | null = null
    const { data: existingToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (existingToken?.token && !existingToken.used_at) {
      unsubscribeToken = existingToken.token
    } else {
      const fresh = generateToken()
      const { error } = await supabase
        .from('email_unsubscribe_tokens')
        .upsert(
          { token: fresh, email: normalizedEmail, used_at: null },
          { onConflict: 'email' },
        )
      if (!error) unsubscribeToken = fresh
    }
    if (!unsubscribeToken) {
      await supabase
        .from('email_send_log')
        .update({ status: 'failed', error_message: 'no unsubscribe token' })
        .eq('message_id', messageId)
      return
    }

    const templateData = {
      source: data.source,
      status: data.status,
      startedAt: data.startedAt,
      durationMs: data.durationMs,
      fetched: data.fetched,
      active: data.active,
      written: data.written,
      newEvents: data.newEvents,
      updatedExisting: data.updatedExisting,
      skippedDupes: data.skippedDupes,
      skippedNoDate: data.skippedNoDate,
      failedPages: data.failedPages,
      errorMessage: data.errorMessage,
    }

    const element = React.createElement(entry.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof entry.subject === 'function'
        ? entry.subject(templateData)
        : entry.subject

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
        label: TEMPLATE_NAME,
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      await supabase
        .from('email_send_log')
        .update({
          status: 'failed',
          error_message: `enqueue: ${enqueueError.message}`,
        })
        .eq('message_id', messageId)
    }
  } catch (err) {
    console.warn('[notify-sync] failed', err)
  }
}
