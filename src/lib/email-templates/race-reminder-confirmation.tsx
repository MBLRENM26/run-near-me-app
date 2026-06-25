import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  eventName?: string
  eventDate?: string | null
  eventLocation?: string | null
  eventUrl?: string
}

const SITE_NAME = 'Running Events Near Me'

const RaceReminderConfirmationEmail = ({
  eventName = 'your race',
  eventDate = null,
  eventLocation = null,
  eventUrl = 'https://runningeventsnearme.com/',
}: Props) => {
  const datePhrase = eventDate ? ` on ${eventDate}` : ''
  const placePhrase = eventLocation ? ` in ${eventLocation}` : ''
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`You're signed up for ${eventName} reminders`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're on the list</Heading>
          <Text style={text}>
            Thanks for signing up. We'll email you about a week before{' '}
            <strong>{eventName}</strong>
            {datePhrase}
            {placePhrase} so you don't miss entries closing.
          </Text>

          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Race:</strong> {eventName}
            </Text>
            {eventDate && (
              <Text style={detailRow}>
                <strong>Date:</strong> {eventDate}
              </Text>
            )}
            {eventLocation && (
              <Text style={detailRow}>
                <strong>Location:</strong> {eventLocation}
              </Text>
            )}
          </Section>

          <Text style={text}>
            View the listing any time:{' '}
            <Link href={eventUrl} style={link}>
              {eventUrl}
            </Link>
          </Text>

          <Text style={footer}>— {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RaceReminderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `You're signed up for ${data?.eventName ?? 'your race'}`,
  displayName: 'Race reminder: confirmation',
  previewData: {
    eventName: 'London Winter 10K',
    eventDate: '14 December 2026',
    eventLocation: 'Hyde Park, London',
    eventUrl: 'https://runningeventsnearme.com/events/london-winter-10k',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const detailRow = { fontSize: '14px', color: '#0f172a', lineHeight: '1.6', margin: '0' }
const link = { color: '#2d9a4e', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
