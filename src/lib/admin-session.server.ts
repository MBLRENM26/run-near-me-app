import { setCookie, deleteCookie, getCookie, getRequestUrl } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

// Server-only module. Every consumer (admin *.functions.ts) loads it with a
// dynamic import inside a function body so it never enters the client import
// graph — TanStack's import-protection plugin rejects
// `@tanstack/react-start/server` in the client environment.

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return secret;
}

async function sign(payload: string): Promise<string> {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function issueAdminSession(): Promise<void> {
  const expMs = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expMs);
  const sig = await sign(payload);
  const requestUrl = getRequestUrl();
  const secure = requestUrl.protocol === "https:";
  setCookie(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const requestUrl = getRequestUrl();
  deleteCookie(COOKIE_NAME, {
    path: "/",
    secure: requestUrl.protocol === "https:",
    sameSite: requestUrl.protocol === "https:" ? "none" : "lax",
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;

  let expected: string;
  try {
    expected = await sign(payload);
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

export async function verifyAdminPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // HMAC both sides to a fixed length so comparison time doesn't leak
  // the configured password's byte length via an early length check.
  const key = getSecret();
  const a = createHmac("sha256", key).update(input).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}
