import { createServerOnlyFn } from "@tanstack/react-start";

// Durable rate limiting for the admin login endpoint.
//
// Two gates share the same admin_login_rate_hits table:
//
//   - Per-IP gate  (public.consume_login_rate):        5 / 15-min UTC bucket,
//                                                     20 / UTC day, per IP.
//   - Global gate  (public.consume_login_rate_global): 60 / 15-min UTC bucket,
//                                                     300 / UTC day, site-wide.
//
// The calling sequence is enforced in adminLogin (src/lib/admin.functions.ts):
// per-IP first (when a trusted IP is available), then global, then password.
// This ordering prevents one already-throttled IP from draining the site-wide
// budget by continuing to hammer the endpoint — a single IP can consume at
// most 5 global slots per 15-minute bucket before its per-IP gate blocks it.
//
// Both gates consume budget on every attempt (successful or not) because that
// is the current atomic contract of consume_login_rate; changing to
// failure-only counting would require a reserve/refund design and is out of
// scope for this hardening pass. Comments must not describe these as
// "failed-login" gates.

export type AdminLoginRateOutcome =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAfterS: number }
  | { ok: false; reason: "server_error" };

export type TrustedIpResolution =
  | { ok: true; ip: string }
  | { ok: false; reason: "missing" };

/**
 * Trust rules:
 *   - cf-connecting-ip only. Ambient x-forwarded-for is NOT trusted because
 *     any client can set it.
 *   - "no-cf-edge" is permitted ONLY when BOTH
 *       NODE_ENV !== "production"
 *       ADMIN_LOGIN_RATE_ALLOW_DEV_MARKER === "1"
 *     hold. The marker cannot weaken a production deployment.
 *
 * Observed behaviour: the published Lovable URL has been seen to omit
 * cf-connecting-ip on the internal server-fn routing path. Callers must
 * fall back to global-only protection rather than 503 when this happens.
 */
export function resolveTrustedIp(
  getRequestHeader: (name: string) => string | undefined,
): TrustedIpResolution {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf?.trim()) return { ok: true, ip: cf.trim() };
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_LOGIN_RATE_ALLOW_DEV_MARKER === "1"
  ) {
    return { ok: true, ip: "no-cf-edge" };
  }
  return { ok: false, reason: "missing" };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function hmacSha256Bytes(
  key: string | Uint8Array,
  message: string,
): Promise<Uint8Array> {
  const encodedKey =
    typeof key === "string" ? new TextEncoder().encode(key) : key;
  const keyBytes = toArrayBuffer(encodedKey);
  const messageBytes = toArrayBuffer(new TextEncoder().encode(message));
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageBytes,
  );
  return new Uint8Array(signature);
}

async function deriveKeyHash(
  ip: string,
  secret: string,
): Promise<Uint8Array> {
  const utcDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const salt = await hmacSha256Bytes(
    secret,
    `admin-login-rate-salt|v1|${utcDate}`,
  );
  return hmacSha256Bytes(salt, ip);
}

type GateRow = {
  allowed: boolean;
  retry_after_s: number;
  bucket_hits: number;
  day_hits: number;
};

type RpcResult = { data: unknown; error: { message: string } | null };

// Structured, PII-free warn logs. We never log the IP, hashes, headers, or
// bucket keys — only that a named event happened and, for gate events, the
// bucket occupancy so we can watch the site-wide budget.
function logEvent(
  event:
    | "admin_login_trusted_ip_missing"
    | "admin_login_ip_gate_exhausted"
    | "admin_login_global_gate_approaching"
    | "admin_login_global_gate_exhausted",
  detail?: Record<string, number | string>,
): void {
  console.warn(`[admin-login-rate] ${event}`, detail ?? {});
}

async function callGateRpc(
  rpc: string,
  args: Record<string, unknown>,
): Promise<GateRow | null> {
  const adminClient = await import("@/integrations/supabase/client.server");
  const { data, error } = await (
    adminClient.supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<RpcResult>
  )(rpc, args);
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.warn(
      `[admin-login-rate] ${rpc} rpc failed:`,
      error?.message ?? "empty result",
    );
    return null;
  }
  return data[0] as GateRow;
}

/**
 * Per-IP gate. Call ONLY when resolveTrustedIp returned an IP.
 * Sets Retry-After + 429 on denial; sets 503 on infra failure.
 */
export const consumeAdminLoginIpRate = createServerOnlyFn(
  async (ip: string): Promise<AdminLoginRateOutcome> => {
    const response = await import("@tanstack/react-start/server");

    let keyHex: string;
    try {
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (!secret || secret.trim().length === 0) {
        throw new Error("ADMIN_SESSION_SECRET_MISSING");
      }
      keyHex = "\\x" + bytesToHex(await deriveKeyHash(ip, secret));
    } catch (err) {
      console.warn(
        "[admin-login-rate] key derivation failed:",
        (err as Error).message,
      );
      response.setResponseStatus(503);
      return { ok: false, reason: "server_error" };
    }

    const row = await callGateRpc("consume_login_rate", { _key_hash: keyHex });
    if (!row) {
      response.setResponseStatus(503);
      return { ok: false, reason: "server_error" };
    }
    if (!row.allowed) {
      const retry = Math.max(1, Math.floor(row.retry_after_s));
      response.setResponseHeader("Retry-After", String(retry));
      response.setResponseStatus(429);
      logEvent("admin_login_ip_gate_exhausted", {
        bucket_hits: row.bucket_hits,
        day_hits: row.day_hits,
      });
      return { ok: false, reason: "rate_limited", retryAfterS: retry };
    }
    return { ok: true };
  },
);

/**
 * Site-wide gate. Always applied on every login attempt after the per-IP
 * gate (or when no trusted IP exists). Sets Retry-After + 429 on denial;
 * sets 503 on infra failure.
 */
export const consumeAdminLoginGlobalRate = createServerOnlyFn(
  async (): Promise<AdminLoginRateOutcome> => {
    const response = await import("@tanstack/react-start/server");
    const row = await callGateRpc("consume_login_rate_global", {});
    if (!row) {
      response.setResponseStatus(503);
      return { ok: false, reason: "server_error" };
    }
    if (!row.allowed) {
      const retry = Math.max(1, Math.floor(row.retry_after_s));
      response.setResponseHeader("Retry-After", String(retry));
      response.setResponseStatus(429);
      logEvent("admin_login_global_gate_exhausted", {
        bucket_hits: row.bucket_hits,
        day_hits: row.day_hits,
      });
      return { ok: false, reason: "rate_limited", retryAfterS: retry };
    }
    // Emit an "approaching" warning at 80% of the 15-minute cap so we notice
    // creeping load before real admins see 429s.
    if (row.bucket_hits >= 48) {
      logEvent("admin_login_global_gate_approaching", {
        bucket_hits: row.bucket_hits,
        day_hits: row.day_hits,
      });
    }
    return { ok: true };
  },
);

// Named export kept for callers that still use the missing-IP-aware entry
// point.
export const logAdminLoginTrustedIpMissing = createServerOnlyFn(async () => {
  logEvent("admin_login_trusted_ip_missing");
});

// Back-compat shim: existing callers import consumeAdminLoginRate. This now
// runs the two-gate sequence (per-IP if available, then global) so an
// unmodified call site keeps working. New code should call the individual
// gates directly for clarity.
export const consumeAdminLoginRate = createServerOnlyFn(
  async (): Promise<AdminLoginRateOutcome> => {
    const response = await import("@tanstack/react-start/server");
    const trust = resolveTrustedIp(response.getRequestHeader);
    if (trust.ok) {
      const ipOutcome = await consumeAdminLoginIpRate(trust.ip);
      if (!ipOutcome.ok) return ipOutcome;
    } else {
      logEvent("admin_login_trusted_ip_missing");
    }
    return consumeAdminLoginGlobalRate();
  },
);
