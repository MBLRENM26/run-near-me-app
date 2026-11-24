// Pure helpers for admin search and session tokens (tested).

/** Strip characters that carry meaning in PostgREST filter syntax. */
export function sanitizeAdminSearch(q: string): string {
  return q.replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export type AdminTokenPayload = { iatMs: number; expMs: number };

/** Payload format: "<issuedAtMs>-<expiresAtMs>". Legacy payloads are rejected. */
export function parseAdminPayload(payload: string): AdminTokenPayload | null {
  const m = /^(\d{10,16})-(\d{10,16})$/.exec(payload);
  if (!m) return null;
  return { iatMs: Number(m[1]), expMs: Number(m[2]) };
}

export function isAdminPayloadValid(p: AdminTokenPayload, nowMs: number, notBeforeMs: number): boolean {
  return p.expMs > nowMs && p.iatMs > notBeforeMs && p.iatMs <= nowMs + 60_000;
}
