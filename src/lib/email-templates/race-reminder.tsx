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
  daysUntil?: number
}

const SITE_NAME = 'Running Events Near Me'

const RaceReminderEmail = ({
  eventName = 'your race',
  eventDate = null,
  eventLocation = null,
  eventUrl = 'https://runningeventsnearme.com/',
  daysUntil = 7,
}: Props) => {
  const datePhrase = eventDate ? ` on ${eventDate}` : ''
  const placePhrase = eventLocation ? ` in ${eventLocation}` : ''
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${eventName} is in ${daysUntil} days`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{`${eventName} is ${daysUntil} days away`}</Heading>
          <Text style={text}>
            You asked us to remind you about{' '}
            <strong>{eventName}</strong>
            {datePhrase}
            {placePhrase}. If you haven't entered yet, now's the time —
            most races close entries this week.
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
            <Link href={eventUrl} style={link}>
              Open the listing for entry details
            </Link>
          </Text>

          <Text style={footer}>— {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RaceReminderEmail,
  subject: (data: Record<string, any>) => {
    const days = data?.daysUntil ?? 7
    const name = data?.eventName ?? 'Your race'
    return `${name} is ${days} days away`
  },
  displayName: 'Race reminder: 7 days out',
  previewData: {
    eventName: 'London Winter 10K',
    eventDate: '14 December 2026',
    eventLocation: 'Hyde Park, London',
    eventUrl: 'https://runningeventsnearme.com/events/london-winter-10k',
    daysUntil: 7,
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
