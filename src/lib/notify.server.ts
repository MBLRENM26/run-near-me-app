// Server-only admin notifications. Delivery precedes append-only audit receipts.
import { TEMPLATES } from '@/lib/email-templates/registry'
import { sendAuditedTemplateEmail } from '@/lib/email-send-audit.server'

export interface NewSubmissionPayload {
  id: string
  email: string
  kind: 'claim' | 'listing' | 'edit' | 'contact'
  claim_slug: string | null
  submitted_at: string
  name?: string
  topic?: string
  race_link?: string | null
  message?: string
}

export function adminNotifyMessageId(submissionId: string): string {
  return `admin-new-submission-${submissionId}`
}

export interface SendAdminNotificationResult {
  ok: boolean
  status: 'sent' | 'suppressed' | 'failed' | 'skipped'
  reason?: string
}

export async function sendNewSubmissionNotification(data: NewSubmissionPayload): Promise<SendAdminNotificationResult> {
  const recipient = TEMPLATES['admin-new-submission']?.to
  if (!recipient) return { ok: false, status: 'skipped', reason: 'template-missing' }
  try {
    const result = await sendAuditedTemplateEmail('admin-new-submission', recipient, adminNotifyMessageId(data.id), {
      submitterEmail: data.email,
      kind: data.kind,
      claimSlug: data.claim_slug,
      submittedAt: data.submitted_at,
      name: data.name,
      topic: data.topic,
      raceLink: data.race_link,
      message: data.message,
    })
    return result.sent ? { ok: true, status: 'sent' } : { ok: false, status: 'suppressed' }
  } catch (error) {
    return { ok: false, status: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}
