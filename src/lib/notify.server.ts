// Admin notification email — enqueues a transactional email to mike@hithe19.com
// whenever a new submission lands. Failures are swallowed so submissions never
// fail because of email problems.

import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Running Events Near Me'
const SENDER_DOMAIN = 'notify.runningeventsnearme.com'
const FROM_DOMAIN = 'runningeventsnearme.com'
const TEMPLATE_NAME = 'admin-new-submission'

export interface NewSubmissionPayload {
  id: string
  email: string
  kind: 'claim' | 'listing'
  claim_slug: string | null
  submitted_at: string
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function sendNewSubmissionNotification(
  data: NewSubmissionPayload,
): Promise<void> {
  try {
    const entry = TEMPLATES[TEMPLATE_NAME]
    if (!entry || !entry.to) {
      console.warn('[notify] admin template missing or has no fixed recipient')
      return
    }

    const recipient = entry.to
    const normalizedEmail = recipient.toLowerCase()
    const messageId = crypto.randomUUID()
    const supabase: any = supabaseAdmin

    const templateData = {
      submitterEmail: data.email,
      kind: data.kind,
      claimSlug: data.claim_slug,
      submittedAt: data.submitted_at,
    }

    // Skip if recipient is suppressed
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (suppressed) {
      console.log('[notify] recipient suppressed, skipping')
      return
    }

    // Get or create unsubscribe token for recipient
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
        console.warn('[notify] failed to confirm unsubscribe token')
        return
      }
      unsubscribeToken = storedToken.token
    } else {
      console.warn('[notify] unsubscribe token used but email not suppressed')
      return
    }

    // Render template
    const element = React.createElement(entry.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof entry.subject === 'function'
        ? entry.subject(templateData)
        : entry.subject

    // Log pending then enqueue
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: TEMPLATE_NAME,
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
        label: TEMPLATE_NAME,
        idempotency_key: `admin-new-submission-${data.id}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.warn('[notify] failed to enqueue admin email', enqueueError)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: TEMPLATE_NAME,
        recipient_email: recipient,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
    }
  } catch (err) {
    console.warn('[notify] admin notification failed', err)
  }
}
