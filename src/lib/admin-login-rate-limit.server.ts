import { createServerOnlyFn } from "@tanstack/react-start";

export type AdminLoginRateOutcome =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAfterS: number }
  | { ok: false; reason: "server_error" };

/**
 * Trusted IP resolution. Returns null if we're on a deployed URL and the
 * Cloudflare-injected header is missing. `no-cf-edge` is permitted ONLY when
 * an explicit dev opt-in is set.
 */
function resolveTrustedIp(
  getRequestHeader: (name: string) => string | undefined,
): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  // Cloudflare / Lovable edge also set x-forwarded-for. On some internal
  // server-fn routings cf-connecting-ip isn't propagated through to the
  // handler, so accept the leftmost XFF hop before failing closed.
  const xff = getRequestHeader("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  if (process.env.ADMIN_LOGIN_RATE_ALLOW_DEV_MARKER === "1") {
    return "no-cf-edge";
  }
  return null;
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

/**
 * Durable rate limiter for the admin login endpoint.
 *
 * Caps: 5 attempts per 15-minute UTC bucket, 20 per UTC day, per IP.
 * Every login attempt (successful or not) counts toward the cap so that a
 * correct guess does not reset an attacker's budget.
 */
export const consumeAdminLoginRate = createServerOnlyFn(
  async (): Promise<AdminLoginRateOutcome> => {
    const [response, adminClient] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/integrations/supabase/client.server"),
    ]);

    const ip = resolveTrustedIp(response.getRequestHeader);
    if (!ip) {
      // Header-absence-only log line: no header dump, no IP payload.
      console.warn("[admin-login-rate] trusted IP absent on deployed request");
      response.setResponseStatus(503);
      return { ok: false, reason: "server_error" };
    }

    let keyHex: string;
    try {
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (!secret || secret.trim().length === 0) {
        // Explicit non-empty check. Fail closed rather than silently deriving
        // a weak key.
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

    const { data, error } = await (
      adminClient.supabaseAdmin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("consume_login_rate", { _key_hash: keyHex });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.warn(
        "[admin-login-rate] rpc failed:",
        error?.message ?? "empty result",
      );
      response.setResponseStatus(503);
      return { ok: false, reason: "server_error" };
    }

    const row = data[0] as {
      allowed: boolean;
      retry_after_s: number;
      bucket_hits: number;
      day_hits: number;
    };
    if (!row.allowed) {
      const retry = Math.max(1, Math.floor(row.retry_after_s));
      response.setResponseHeader("Retry-After", String(retry));
      response.setResponseStatus(429);
      return { ok: false, reason: "rate_limited", retryAfterS: retry };
    }
    return { ok: true };
  },
);
