import { EmailAPIError } from '@lovable.dev/email-js'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Kept legacy audit tables are receipts only; they never decide delivery.
export async function sendAuditedTemplateEmail(
  templateName: string,
  recipient: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  const effectiveRecipient = TEMPLATES[templateName]?.to || recipient
  const writeReceipt = async (status: 'sent' | 'suppressed' | 'failed', errorMessage?: string) => {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { error } = await supabaseAdmin.from('email_send_log').insert({
        message_id: idempotencyKey,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status,
        error_message: errorMessage?.slice(0, 1000) ?? null,
      })
      if (error) console.error('[email-audit] receipt failed', { code: error.code, message: error.message })
    } catch {
      console.error('[email-audit] receipt unavailable')
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, recipient, { templateData, idempotencyKey })
    await writeReceipt(result.sent ? 'sent' : 'suppressed')
    return result
  } catch (error) {
    await writeReceipt('failed', error instanceof Error ? error.message : String(error))
    // Existing callers may continue a recipient loop: respect the provider's
    // cooldown before returning control, without persisted queue retry state.
    if (error instanceof EmailAPIError && error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, (error.retryAfterSeconds ?? 60) * 1000))
    }
    throw error
  }
}