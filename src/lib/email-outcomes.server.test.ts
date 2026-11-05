import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailWebhookEvent } from '@lovable.dev/email-js'
const mocks = vi.hoisted(() => ({ insert: vi.fn(), upsert: vi.fn(), lookup: vi.fn() }))
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({
  select: () => ({ eq: () => ({ limit: mocks.lookup }) }), insert: mocks.insert, upsert: mocks.upsert,
}) } }))
import { recordEmailOutcome } from './email-outcomes.server'
const event = (type: EmailWebhookEvent['type']): EmailWebhookEvent => ({
  event_id: 'event-1', type, run_id: 'run-1', project_id: 'test', environment: 'prod', timestamp: '2026-11-05', version: '1',
  data: { event: type, recipient: 'Runner@Example.test', message_id: 'message-1' },
})
beforeEach(() => {
  mocks.lookup.mockReset().mockResolvedValue({ data: [], error: null })
  mocks.insert.mockReset().mockResolvedValue({ error: null })
  mocks.upsert.mockReset().mockResolvedValue({ error: null })
})
describe('legacy outcome data contract', () => {
  it.each([
    ['email.bounced', 'bounce', 'bounced'],
    ['email.complaint', 'complaint', 'complained'],
    ['email.unsubscribed', 'unsubscribe', 'suppressed'],
  ] as const)('%s preserves existing reason and status', async (type, reason, status) => {
    await recordEmailOutcome(event(type))
    expect(mocks.upsert).toHaveBeenCalledWith({ email: 'runner@example.test', reason, metadata: null }, { onConflict: 'email' })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ template_name: 'system', status, metadata: null }))
  })
  it('redelivery does not duplicate receipts', async () => {
    mocks.lookup.mockResolvedValue({ data: [{ id: 'existing' }], error: null })
    await recordEmailOutcome(event('email.bounced'))
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('a failed write throws for webhook retry', async () => {
    mocks.upsert.mockResolvedValue({ error: { code: 'XX', message: 'unavailable' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(recordEmailOutcome(event('email.bounced'))).rejects.toThrow('Email outcome receipt failed')
    expect(mocks.insert).not.toHaveBeenCalled()
    log.mockRestore()
  })
})