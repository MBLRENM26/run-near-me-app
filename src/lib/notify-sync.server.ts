// Sync notification failures must never break ingestion.
import { TEMPLATES } from '@/lib/email-templates/registry'
import { sendAuditedTemplateEmail } from '@/lib/email-send-audit.server'

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

export async function sendSyncSummaryNotification(data: SyncSummaryPayload): Promise<void> {
  const recipient = TEMPLATES['admin-sync-summary']?.to
  if (!recipient) return
  try {
    await sendAuditedTemplateEmail('admin-sync-summary', recipient, `admin-sync-summary-${data.syncRunId}`, { ...data })
  } catch {
    console.warn('[notify-sync] notification failed; see email receipts')
  }
}
