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

interface AdminSyncSummaryProps {
  source?: string
  status?: string
  startedAt?: string
  durationMs?: number | null
  fetched?: number | null
  active?: number | null
  written?: number | null
  newEvents?: number | null
  updatedExisting?: number | null
  skippedDupes?: number | null
  skippedNoDate?: number | null
  failedPages?: number | null
  errorMessage?: string | null
}

const SITE_NAME = 'Running Events Near Me'
const ADMIN_URL = 'https://runningeventsnearme.com/admin/sync-runs'

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m ${rs}s`
}

function fmtDate(iso?: string): string {
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

const AdminSyncSummaryEmail = ({
  source = 'unknown',
  status = 'success',
  startedAt,
  durationMs,
  fetched,
  active,
  written,
  newEvents,
  updatedExisting,
  skippedDupes,
  skippedNoDate,
  failedPages,
  errorMessage,
}: AdminSyncSummaryProps) => {
  const ok = status === 'success'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${source} sync: ${fmt(newEvents)} new, ${fmt(updatedExisting)} updated`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sync summary — {source}</Heading>
          <Text style={text}>
            <strong style={{ color: ok ? '#166534' : '#b91c1c' }}>
              {status.toUpperCase()}
            </strong>{' '}
            · {fmtDate(startedAt)} · {fmtDuration(durationMs)}
          </Text>

          <Section style={box}>
            <Text style={row}>
              <strong>New events:</strong> {fmt(newEvents)}
            </Text>
            <Text style={row}>
              <strong>Updated existing:</strong> {fmt(updatedExisting)}
            </Text>
            <Text style={row}>
              <strong>Written total:</strong> {fmt(written)}
            </Text>
            <Text style={row}>
              <strong>Fetched:</strong> {fmt(fetched)}
              {active !== null && active !== undefined ? ` (active: ${active})` : ''}
            </Text>
            <Text style={row}>
              <strong>Skipped — duplicates:</strong> {fmt(skippedDupes)}
            </Text>
            <Text style={row}>
              <strong>Skipped — no date:</strong> {fmt(skippedNoDate)}
            </Text>
            <Text style={row}>
              <strong>Failed pages:</strong> {fmt(failedPages)}
            </Text>
          </Section>

          {errorMessage ? (
            <Section style={errBox}>
              <Text style={errText}>
                <strong>Error:</strong> {errorMessage}
              </Text>
            </Section>
          ) : null}

          <Text style={text}>
            <Link href={ADMIN_URL} style={link}>
              View sync history →
            </Link>
          </Text>

          <Text style={footer}>— {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminSyncSummaryEmail,
  subject: (data: Record<string, any>) => {
    const source = data?.source ?? 'sync'
    const status = data?.status ?? 'success'
    const nnew = data?.newEvents ?? 0
    const upd = data?.updatedExisting ?? 0
    return `[${status}] ${source} — ${nnew} new, ${upd} updated`
  },
  displayName: 'Admin: sync summary',
  to: 'mike@hithe19.com',
  previewData: {
    source: 'england-athletics',
    status: 'success',
    startedAt: new Date().toISOString(),
    durationMs: 42000,
    fetched: 120,
    active: 118,
    written: 118,
    newEvents: 3,
    updatedExisting: 115,
    skippedDupes: 0,
    skippedNoDate: 2,
    failedPages: 0,
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
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const box = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const row = {
  fontSize: '14px',
  color: '#0f172a',
  lineHeight: '1.6',
  margin: '0',
}
const errBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const errText = {
  fontSize: '13px',
  color: '#b91c1c',
  lineHeight: '1.6',
  margin: '0',
}
const link = { color: '#2d9a4e', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '28px 0 0',
}
