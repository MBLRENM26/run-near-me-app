import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
import { template as adminNewSubmission } from './admin-new-submission'
import { template as raceReminderConfirmation } from './race-reminder-confirmation'
import { template as raceReminder } from './race-reminder'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-new-submission': adminNewSubmission,
  'race-reminder-confirmation': raceReminderConfirmation,
  'race-reminder': raceReminder,
}
