import { createHmac, timingSafeEqual } from "crypto";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function issueAdminSession(): void {
  const expMs = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expMs);
  const sig = sign(payload);
  setCookie(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearAdminSession(): void {
  deleteCookie(COOKIE_NAME, {
    path: "/",
    secure: true,
    sameSite: "none",
  });
}

export function isAdminAuthenticated(): boolean {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  if (!timingSafeEqual(a, b)) return false;

  const expMs = Number(payload);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
  return true;
}

// TEMP DIAGNOSTIC — remove after debugging published-URL auth issue.
export function diagnoseAdminAuth(): {
  secret_present: boolean;
  cookie_present: boolean;
  cookie_well_formed: boolean;
  hmac_ok: boolean;
  expired: boolean;
  reason: string;
} {
  const secret_present = !!process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16;
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return { secret_present, cookie_present: false, cookie_well_formed: false, hmac_ok: false, expired: false, reason: "no_cookie" };
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return { secret_present, cookie_present: true, cookie_well_formed: false, hmac_ok: false, expired: false, reason: "malformed" };
  let expected: string;
  try { expected = sign(payload); } catch { return { secret_present, cookie_present: true, cookie_well_formed: true, hmac_ok: false, expired: false, reason: "no_secret" }; }
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  const hmac_ok = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  if (!hmac_ok) return { secret_present, cookie_present: true, cookie_well_formed: true, hmac_ok: false, expired: false, reason: "bad_signature" };
  const expMs = Number(payload);
  const expired = !Number.isFinite(expMs) || expMs < Date.now();
  return { secret_present, cookie_present: true, cookie_well_formed: true, hmac_ok: true, expired, reason: expired ? "expired" : "ok" };
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // HMAC both sides to a fixed length so comparison time doesn't leak
  // the configured password's byte length via an early length check.
  const key = getSecret();
  const a = createHmac("sha256", key).update(input).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}
