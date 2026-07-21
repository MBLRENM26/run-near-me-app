const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

// All `@tanstack/react-start/server` and `node:crypto` imports are loaded
// via dynamic import inside each function so this module is safe to appear
// (even transiently, via top-level imports of *.functions.ts modules) in
// the client dependency graph. Top-level imports of either would be
// rejected by TanStack's client-environment import-protection plugin.

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return secret;
}

async function sign(payload: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function issueAdminSession(): Promise<void> {
  const { setCookie } = await import("@tanstack/react-start/server");
  const expMs = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expMs);
  const sig = await sign(payload);
  setCookie(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(COOKIE_NAME, {
    path: "/",
    secure: true,
    sameSite: "lax",
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const { getCookie } = await import("@tanstack/react-start/server");
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

  const { timingSafeEqual } = await import("crypto");
  const { Buffer } = await import("buffer");
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
  const { createHmac, timingSafeEqual } = await import("crypto");
  // HMAC both sides to a fixed length so comparison time doesn't leak
  // the configured password's byte length via an early length check.
  const key = getSecret();
  const a = createHmac("sha256", key).update(input).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}
