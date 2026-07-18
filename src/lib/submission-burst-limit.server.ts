import { createHash, randomBytes } from "node:crypto";
import { resolveClientIpServer } from "@/lib/client-ip.server";

// Per-worker in-memory sliding window: 5 attempts / 10 minutes per IP-derived
// key. Friction, not bot protection — worker isolates don't share state.
// Escalation: Cloudflare WAF / Turnstile, or shared store (Durable Object / Redis).
//
// Key = sha256(ip + "|" + utc_date + "|" + daily_salt). Raw IP and hash are
// never persisted or logged with submission rows.
const SUBMIT_LIMIT_MAX = 5;
const SUBMIT_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const SUBMIT_LIMIT_MAX_KEYS = 5000;
const submitAttempts = new Map<string, { count: number; resetAt: number }>();

let dailySalt = { day: "", value: randomBytes(16).toString("hex") };
function currentDailySalt(): { day: string; value: string } {
  const day = new Date().toISOString().slice(0, 10);
  if (dailySalt.day !== day) {
    dailySalt = { day, value: randomBytes(16).toString("hex") };
  }
  return dailySalt;
}

function submissionRateKey(): string {
  const ip = resolveClientIpServer();
  const salt = currentDailySalt();
  return createHash("sha256")
    .update(`${ip}|${salt.day}|${salt.value}`)
    .digest("hex");
}

export function checkSubmissionRateLimit(keyOverride?: string): boolean {
  const key = keyOverride ?? submissionRateKey();
  const now = Date.now();
  const entry = submitAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    if (submitAttempts.size >= SUBMIT_LIMIT_MAX_KEYS) {
      for (const [k, v] of submitAttempts) {
        if (v.resetAt <= now) submitAttempts.delete(k);
      }
      if (submitAttempts.size >= SUBMIT_LIMIT_MAX_KEYS) {
        const sorted = [...submitAttempts.entries()].sort(
          (a, b) => a[1].resetAt - b[1].resetAt,
        );
        const toDrop = submitAttempts.size - SUBMIT_LIMIT_MAX_KEYS + 1;
        for (let i = 0; i < toDrop && i < sorted.length; i++) {
          submitAttempts.delete(sorted[i][0]);
        }
      }
    }
    submitAttempts.set(key, { count: 1, resetAt: now + SUBMIT_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= SUBMIT_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}
