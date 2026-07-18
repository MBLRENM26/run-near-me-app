// Layer 2 durable rate limiter for public submission paths.
//
// Enforcement contract (see .lovable/plan.md):
//   - 10 submissions per current UTC hour per pseudonymous key.
//   - 30 submissions per current UTC day per pseudonymous key.
//   - Key = HMAC(HMAC(ADMIN_SESSION_SECRET, "submission-rate-salt|v1|<UTC_DATE>"), cf-connecting-ip).
//     Deterministic across every worker isolate on the same UTC day.
//   - Trusted header: only cf-connecting-ip. Missing on a deployed URL =>
//     fail-closed 503; the dev/test marker is permitted only when
//     SUBMISSION_RATE_LIMIT_ALLOW_DEV_MARKER === "1" is explicitly set.
//   - The atomic decision (both bucket counts read + coupled increment)
//     lives in public.consume_submission_rate; this file only derives the
//     key and interprets the RPC result.
//
// This module is server-only: filename ends in .server.ts.

import { createServerOnlyFn } from "@tanstack/react-start";

export type RateOutcome =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAfterS: number }
  | { ok: false; reason: "server_error" };

/**
 * Trusted IP resolution. Returns null if we're on a deployed URL and the
 * Cloudflare-injected header is missing. `no-cf-edge` is permitted ONLY when
 * an explicit dev opt-in is set — NODE_ENV alone is insufficient because
 * preview builds can be compiled with production-like values.
 */
function resolveTrustedIp(getRequestHeader: (name: string) => string | undefined): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  if (process.env.SUBMISSION_RATE_LIMIT_ALLOW_DEV_MARKER === "1") {
    return "no-cf-edge";
  }
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hmacSha256Bytes(
  key: string | Uint8Array,
  message: string,
): Promise<Uint8Array> {
  const keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
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
    new TextEncoder().encode(message),
  );
  return new Uint8Array(signature);
}

async function deriveKeyHash(ip: string): Promise<Uint8Array> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Explicit non-empty check. No TS non-null assertion — if the secret is
    // ever missing, we fail closed rather than silently deriving a weak key.
    throw new Error("ADMIN_SESSION_SECRET_MISSING");
  }
  const utcDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const salt = await hmacSha256Bytes(
    secret,
    `submission-rate-salt|v1|${utcDate}`,
  );
  return hmacSha256Bytes(salt, ip);
}

/**
 * Layer 2 check. Call AFTER the in-memory Layer 1 limiter has admitted the
 * request. On denial or infrastructure failure this function sets the
 * appropriate response status/header itself so callers can just return the
 * outcome shape.
 */
export const consumeDurableSubmissionRate = createServerOnlyFn(async (): Promise<RateOutcome> => {
  const [response, adminClient] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/integrations/supabase/client.server"),
  ]);

  const ip = resolveTrustedIp(response.getRequestHeader);
  if (!ip) {
    // Header-absence-only log line: no header dump, no IP payload.
    console.warn("[submission-rate] cf-connecting-ip absent on deployed request");
    response.setResponseStatus(503);
    return { ok: false, reason: "server_error" };
  }

  let keyHex: string;
  try {
    keyHex = "\\x" + bytesToHex(await deriveKeyHash(ip));
  } catch (err) {
    // ADMIN_SESSION_SECRET missing / blank at derivation time.
    console.warn(
      "[submission-rate] key derivation failed:",
      (err as Error).message,
    );
    response.setResponseStatus(503);
    return { ok: false, reason: "server_error" };
  }

  const { data, error } = await (adminClient.supabaseAdmin.rpc as any)(
    "consume_submission_rate",
    { _key_hash: keyHex },
  );

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.warn(
      "[submission-rate] rpc failed:",
      error?.message ?? "empty result",
    );
    response.setResponseStatus(503);
    return { ok: false, reason: "server_error" };
  }

  const row = data[0] as {
    allowed: boolean;
    retry_after_s: number;
    hour_hits: number;
    day_hits: number;
  };
  if (!row.allowed) {
    const retry = Math.max(1, Math.floor(row.retry_after_s));
    response.setResponseHeader("Retry-After", String(retry));
    response.setResponseStatus(429);
    return { ok: false, reason: "rate_limited", retryAfterS: retry };
  }
  return { ok: true };
});
