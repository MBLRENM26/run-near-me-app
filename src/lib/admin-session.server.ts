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
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearAdminSession(): void {
  deleteCookie(COOKIE_NAME, {
    path: "/",
    secure: true,
    sameSite: "lax",
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
