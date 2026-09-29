import { createHmac, timingSafeEqual } from "node:crypto";

export function validResearchSignature(
  secret: string,
  ts: string,
  body: string,
  signature: string,
  now = Date.now(),
): boolean {
  if (
    !/^\d{10}$/.test(ts) ||
    Math.abs(now / 1000 - Number(ts)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export async function boundedResearchBody(request: Request, limit = 512_000): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
