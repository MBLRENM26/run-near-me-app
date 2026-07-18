import { getRequestHeader } from "@tanstack/react-start/server";

export function resolveClientIpServer(): string {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
