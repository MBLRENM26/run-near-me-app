import type { EmailWebhookEvent } from '@lovable.dev/email-js'

const outcomes = {
  'email.bounced': { reason: 'bounce', status: 'bounced', message: 'Permanent bounce — email address is invalid or rejected' },
  'email.complaint': { reason: 'complaint', status: 'complained', message: 'Spam complaint — recipient marked email as spam' },
  'email.unsubscribed': { reason: 'unsubscribe', status: 'suppressed', message: 'Recipient unsubscribed' },
} as const

export async function recordEmailOutcome(event: EmailWebhookEvent) {
  if (event.type === 'email.resubscribed') return
  const outcome = outcomes[event.type]
  // Stable receipt primary key makes redelivery idempotent without new tables
  // or repurposing the legacy metadata column.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.event_id))
  const hex = Array.from(new Uint8Array(digest)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const receiptId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const check = (error: { code: string; message: string } | null) => {
    if (!error) return
    console.error('[email-events] receipt failed', { code: error.code, message: error.message, event_id: event.event_id })
    throw new Error('Email outcome receipt failed')
  }
  const { data: existing, error: lookupError } = await supabaseAdmin.from('email_send_log')
    .select('id').eq('id', receiptId).limit(1)
  check(lookupError)
  if (existing?.length) return

  const recipient = event.data.recipient.toLowerCase()
  const { error: suppressError } = await supabaseAdmin.from('suppressed_emails').upsert({
    email: recipient, reason: outcome.reason, metadata: null,
  }, { onConflict: 'email' })
  check(suppressError)
  const { error: logError } = await supabaseAdmin.from('email_send_log').insert({
    id: receiptId,
    message_id: event.data.message_id || null,
    template_name: 'system',
    recipient_email: recipient,
    status: outcome.status,
    error_message: outcome.message,
    metadata: null,
  })
  // Another delivery may have inserted the same receipt after the read.
  if (logError?.code === '23505') return
  check(logError)
}