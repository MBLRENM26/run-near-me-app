import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { boundedResearchBody } from "./source-research-auth.server";
import { calendarDelta, COVERAGE_CALENDARS, extractCalendarLinks, trialActive, type CalendarLink } from "./coverage-monitor";

type CalendarReceipt = {
  label: string; url: string; checkedAt: string; status: string;
  links: CalendarLink[]; leads: (CalendarLink & { newlySeen: boolean })[];
};

async function fetchCalendar(url: string): Promise<string> {
  // No arbitrary URL, redirects, script execution, credentials or forms.
  const response = await globalThis.fetch(url, {
    headers: { "User-Agent": "RENM-Coverage/1.0 (+https://runningeventsnearme.com/contact)" },
    redirect: "error", signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Website returned ${response.status}`);
  if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("Website did not return HTML");
  return boundedResearchBody(new Request("https://local.invalid", { method: "POST", body: response.body, duplex: "half" } as RequestInit), 1_000_000);
}

export async function runCoverageCheck() {
  const now = new Date();
  if (!trialActive(now)) return { ok: false, expired: true };
  const db = supabaseAdmin;
  const { data: collected, error } = await db.rpc("collect_coverage_report");
  if (error) throw new Error(error.message);
  const report = collected as unknown as { id: string; audit_day: string; calendars: CalendarReceipt[] };
  const { data: previous, error: historyError } = await db.from("coverage_reports")
    .select("calendars, created_at").lt("audit_day", report.audit_day).order("audit_day", { ascending: false }).limit(8);
  if (historyError) throw new Error(historyError.message);
  const previousCalendar = previous?.find((r) => Array.isArray(r.calendars) && r.calendars.length);
  const lastChecked = (previousCalendar?.calendars as unknown as CalendarReceipt[] | undefined)?.[0]?.checkedAt;
  const calendarDue = !report.calendars?.length && (!lastChecked || now.getTime() - Date.parse(lastChecked) >= 7 * 86400_000);
  if (!calendarDue) return { ok: true, id: report.id, calendarsChecked: 0 };

  // Include historical URLs: a calendar lead is not automatically a new edition.
  const knownUrls: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: rows, error: readError } = await db.from("events")
      .select("organiser_url, entry_url").order("id").range(offset, offset + 999);
    if (readError) throw new Error(readError.message);
    for (const row of rows ?? []) for (const url of [row.organiser_url, row.entry_url]) if (url) knownUrls.push(url);
    if ((rows?.length ?? 0) < 1000) break;
  }
  const receipts: CalendarReceipt[] = [];
  for (const source of COVERAGE_CALENDARS) {
    const old = (previousCalendar?.calendars as unknown as CalendarReceipt[] | undefined)?.find((r) => r.url === source.url);
    try {
      // Fail closed when robots is unavailable or forbids this collector.
      const robots = await globalThis.fetch(new URL("/robots.txt", source.url), { redirect: "error", signal: AbortSignal.timeout(10_000) });
      if (!robots.ok) throw new Error("Robots permission could not be checked");
      const policy = await robots.text();
      if (/Disallow:\s*\/(?:\s|$)/i.test(policy)) throw new Error("Robots restriction requires review");
      const html = await fetchCalendar(source.url);
      const links = extractCalendarLinks(html, source.url);
      receipts.push({ label: source.label, url: source.url, checkedAt: now.toISOString(), status: links.length ? "checked" : "No readable event links; manual check needed", links, leads: calendarDelta(links, knownUrls, old?.links.map((l) => l.url) ?? []) });
    } catch (e) {
      receipts.push({ label: source.label, url: source.url, checkedAt: now.toISOString(), status: e instanceof Error ? e.message : "Website unavailable", links: [], leads: [] });
    }
  }
  const { error: saveError } = await db.from("coverage_reports").update({ calendars: receipts as unknown as import("@/integrations/supabase/types").Json }).eq("id", report.id);
  if (saveError) throw new Error(saveError.message);
  return { ok: true, id: report.id, calendarsChecked: receipts.length };
}