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

interface AdminNewSubmissionProps {
  submitterEmail?: string
  kind?: 'claim' | 'listing' | 'edit' | 'contact'
  claimSlug?: string | null
  submittedAt?: string
  name?: string
  topic?: string
  raceLink?: string | null
  message?: string
}

const SITE_NAME = 'Running Events Near Me'
const REVIEW_URL = 'https://runningeventsnearme.com/admin/claims'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/London',
    })
  } catch {
    return iso
  }
}

const AdminNewSubmissionEmail = ({
  submitterEmail = '—',
  kind = 'listing',
  claimSlug = null,
  submittedAt,
  name,
  topic,
  raceLink,
  message,
}: AdminNewSubmissionProps) => {
  const kindLabel =
    kind === 'claim'
      ? 'Listing claim'
      : kind === 'edit'
        ? 'Edit report'
        : kind === 'contact'
          ? 'Contact message'
          : 'New listing'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${kindLabel} from ${submitterEmail}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{kindLabel}</Heading>
          <Text style={text}>
            A new submission just came in on {SITE_NAME}.
          </Text>

          <Section style={detailBox}>
            {name && (
              <Text style={detailRow}>
                <strong>Name:</strong> {name}
              </Text>
            )}
            <Text style={detailRow}>
              <strong>Submitter:</strong> {submitterEmail}
            </Text>
            <Text style={detailRow}>
              <strong>Kind:</strong> {kind}
            </Text>
            {topic && (
              <Text style={detailRow}>
                <strong>Topic:</strong> {topic}
              </Text>
            )}
            {raceLink && (
              <Text style={detailRow}>
                <strong>Race:</strong> {raceLink}
              </Text>
            )}
            {kind !== 'contact' && (
              <Text style={detailRow}>
                <strong>Claim slug:</strong> {claimSlug ?? '—'}
              </Text>
            )}
            <Text style={detailRow}>
              <strong>Submitted:</strong> {formatDate(submittedAt)}
            </Text>
          </Section>

          {message && <Text style={{ ...text, whiteSpace: 'pre-wrap' }}>{message}</Text>}

          {kind === 'contact' ? (
            <Text style={text}>Reply directly to {submitterEmail}.</Text>
          ) : (
            <Text style={text}>
              Review and action it in the admin queue:{' '}
              <Link href={REVIEW_URL} style={link}>
                {REVIEW_URL}
              </Link>
            </Text>
          )}

          <Text style={footer}>— {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminNewSubmissionEmail,
  subject: (data: Record<string, any>) => {
    const email = data?.submitterEmail ?? 'unknown'
    if (data?.kind === 'contact') return `Contact message — ${email}`
    const kind = data?.kind === 'claim' ? 'claim' : 'listing'
    return `New ${kind} — ${email}`
  },
  displayName: 'Admin: new submission',
  to: 'mike@hithe19.com',
  previewData: {
    submitterEmail: 'runner@example.com',
    kind: 'claim',
    claimSlug: 'example-10k',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const detailBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const detailRow = {
  fontSize: '14px',
  color: '#0f172a',
  lineHeight: '1.6',
  margin: '0',
}
const link = { color: '#2d9a4e', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '28px 0 0',
}
