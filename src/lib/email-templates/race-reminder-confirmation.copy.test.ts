import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { template } from './race-reminder-confirmation'

const source = readFileSync(
  new URL('./race-reminder-confirmation.tsx', import.meta.url),
  'utf8',
)

describe('race reminder confirmation copy', () => {
  it('uses the approved subject line', () => {
    expect(template.subject({ eventName: 'London Winter 10K' })).toBe(
      'Your reminder is confirmed for London Winter 10K',
    )
  })

  it('uses the approved preview, heading and opening paragraph', () => {
    expect(source).toContain('Your reminder for ${eventName} is confirmed')
    expect(source).toContain('Your reminder is confirmed</Heading>')
    expect(source).toContain('Thanks for your reminder request for')
    expect(source).toContain('It’s been noted and we’ll be in touch with a reminder.')
  })

  it('does not describe internal or manual handling', () => {
    expect(source).not.toMatch(/manual|internal|queue|process/i)
  })
})
