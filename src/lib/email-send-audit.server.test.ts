import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ send: vi.fn(), insert: vi.fn() }))
vi.mock('@/lib/email-templates/send-email', () => ({ sendTemplateEmail: mocks.send }))
vi.mock('@/lib/email-templates/registry', () => ({ TEMPLATES: { 'admin-new-submission': { to: 'owner@example.test' } } }))
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({ insert: mocks.insert }) } }))
import { sendAuditedTemplateEmail } from './email-send-audit.server'
import { sendRaceEmail } from './race-email.server'
import { sendNewSubmissionNotification } from './notify.server'

beforeEach(() => {
  mocks.send.mockReset()
  mocks.insert.mockReset().mockResolvedValue({ error: null })
})
describe('managed email receipts', () => {
  it('records sent only after delivery succeeds and preserves fixed admin recipient and event key', async () => {
    mocks.send.mockImplementation(async () => {
      expect(mocks.insert).not.toHaveBeenCalled()
      return { sent: true }
    })
    const result = await sendNewSubmissionNotification({ id: 'submission-1', email: 'runner@example.test', kind: 'contact', claim_slug: null, submitted_at: '2026-11-05' })
    expect(result).toEqual({ ok: true, status: 'sent' })
    expect(mocks.send).toHaveBeenCalledWith('admin-new-submission', 'owner@example.test', expect.objectContaining({ idempotencyKey: 'admin-new-submission-submission-1' }))
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent', message_id: 'admin-new-submission-submission-1', recipient_email: 'owner@example.test' }))
  })
  it('a suppressed race recipient gets no sent receipt and is not retried', async () => {
    mocks.send.mockResolvedValue({ sent: false, reason: 'recipient_suppressed' })
    expect(await sendRaceEmail({ templateName: 'race-reminder-confirmation', recipientEmail: 'runner@example.test', idempotencyKey: 'confirmation-1', templateData: {} })).toEqual({ ok: false, reason: 'suppressed' })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'suppressed' }))
  })
  it('failed delivery records failed, not sent', async () => {
    mocks.send.mockRejectedValue(new Error('provider unavailable'))
    await expect(sendAuditedTemplateEmail('race-reminder', 'runner@example.test', 'reminder-1', {})).rejects.toThrow('provider unavailable')
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error_message: 'provider unavailable' }))
  })
  it('a receipt failure cannot turn successful dispatch into failed delivery', async () => {
    mocks.send.mockResolvedValue({ sent: true })
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await sendAuditedTemplateEmail('race-reminder', 'runner@example.test', 'reminder-1', {})).toEqual({ sent: true })
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})