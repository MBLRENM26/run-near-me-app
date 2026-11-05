// Server-only race email delivery; scheduled reminder containment remains in its hook.
import { sendAuditedTemplateEmail } from '@/lib/email-send-audit.server'

export interface SendRaceEmailInput {
  templateName: 'race-reminder-confirmation' | 'race-reminder'
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
}

export async function sendRaceEmail(input: SendRaceEmailInput): Promise<{ ok: boolean; reason?: string }> {
  const recipient = input.recipientEmail.trim()
  if (!recipient) return { ok: false, reason: 'empty_recipient' }
  try {
    const result = await sendAuditedTemplateEmail(input.templateName, recipient, input.idempotencyKey, input.templateData)
    return result.sent ? { ok: true } : { ok: false, reason: 'suppressed' }
  } catch {
    return { ok: false, reason: 'exception' }
  }
}
