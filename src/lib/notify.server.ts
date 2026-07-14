// Admin notification email — enqueues a transactional email to the admin
// address whenever a new submission lands. Never blocks the user-facing flow,
// but ALWAYS leaves an audit row in `email_send_log` so misses are visible.
//
// The log row's `message_id` is deterministic:
//   admin-new-submission-<submissionId>
// so the safety-net cron can check "was this submission already notified?"
// with a single indexed lookup.

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
  kind: 'claim' | 'listing' | 'edit'
  claim_slug: string | null
  submitted_at: string
}

export function adminNotifyMessageId(submissionId: string): string {
  return `admin-new-submission-${submissionId}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function upsertUnsubscribeToken(
  supabase: any,
  email: string,
): Promise<string | null> {
  // Try to read an existing token first.
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', email)
    .maybeSingle()

  if (existing?.token && !existing.used_at) return existing.token

  // Either no row, or token was already used. Mint a fresh one and
  // overwrite. The admin recipient is our own address so re-issuing is
  // fine — an "unsubscribed" admin address would just mean the row lives
  // in `suppressed_emails` and we'd never reach this branch anyway.
  const fresh = generateToken()
  const { error } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert(
      { token: fresh, email, used_at: null },
      { onConflict: 'email' },
    )
  if (error) {
    console.warn('[notify] token upsert failed', { email, error: error.message })
    return null
  }
  return fresh
}

export interface SendAdminNotificationResult {
  ok: boolean
  status: 'sent' | 'suppressed' | 'failed' | 'skipped'
  reason?: string
}

export async function sendNewSubmissionNotification(
  data: NewSubmissionPayload,
): Promise<SendAdminNotificationResult> {
  const supabase: any = supabaseAdmin
  const messageId = adminNotifyMessageId(data.id)
  const entry = TEMPLATES[TEMPLATE_NAME]

  if (!entry || !entry.to) {
    console.warn('[notify] admin template missing or has no fixed recipient', {
      submission_id: data.id,
    })
    return { ok: false, status: 'skipped', reason: 'template-missing' }
  }

  const recipient = entry.to
  const normalizedEmail = recipient.toLowerCase()

  // Insert the pending log row FIRST so the attempt is visible even if
  // the rest of this function throws. Use an idempotent message_id so
  // repeated calls for the same submission collapse into a single row.
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

  const markFailed = async (reason: string) => {
    await supabase
      .from('email_send_log')
      .update({ status: 'failed', error_message: reason })
      .eq('message_id', messageId)
    console.warn('[notify] admin notification failed', {
      submission_id: data.id,
      reason,
    })
    return { ok: false, status: 'failed' as const, reason }
  }

  try {
    // Suppression check
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (suppressed) {
      await supabase
        .from('email_send_log')
        .update({ status: 'suppressed', error_message: 'recipient suppressed' })
        .eq('message_id', messageId)
      return { ok: false, status: 'suppressed' }
    }

    // Unsubscribe token
    const unsubscribeToken = await upsertUnsubscribeToken(
      supabase,
      normalizedEmail,
    )
    if (!unsubscribeToken) {
      return await markFailed('unsubscribe-token-upsert-failed')
    }

    // Render
    const templateData = {
      submitterEmail: data.email,
      kind: data.kind,
      claimSlug: data.claim_slug,
      submittedAt: data.submitted_at,
    }
    const element = React.createElement(entry.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof entry.subject === 'function'
        ? entry.subject(templateData)
        : entry.subject

    // Enqueue
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
      return await markFailed(`enqueue: ${enqueueError.message ?? 'unknown'}`)
    }

    return { ok: true, status: 'sent' }
  } catch (err) {
    return await markFailed(err instanceof Error ? err.message : String(err))
  }
}
