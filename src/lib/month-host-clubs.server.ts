import { resolveMonthHostClubs, type ClubMapping, type HostLink, type MonthHostClub } from "./month-host-clubs";

/** Only previously eligible month events enter this reader. No intake or name matching. */
export async function loadMonthHostClubs(eventIds: string[]): Promise<MonthHostClub[]> {
  if (!eventIds.length) return [];
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const links: HostLink[] = [];
    const events: { id: string; organiser_club_id: string | null }[] = [];
    for (let offset = 0; offset < eventIds.length; offset += 100) {
      const ids = eventIds.slice(offset, offset + 100);
      const eventResult = await db.from("events").select("id,organiser_club_id,date_from,sort_date")
        .in("id", ids).is("duplicate_of", null).eq("date_is_estimated", false)
        .gte("sort_date", new Date().toISOString().slice(0, 10));
      if (eventResult.error) throw eventResult.error;
      events.push(...(eventResult.data ?? []).filter((e) => e.date_from && e.date_from === e.sort_date));
      for (let page = 0; ; page += 1000) {
        const result = await db.from("organisation_event_links")
          .select("event_id,organisation_id,relationship,review_status,confidence")
          .in("event_id", ids).eq("relationship", "organises")
          .eq("review_status", "accepted").eq("confidence", "verified")
          .order("id").range(page, page + 999);
        if (result.error) throw result.error;
        links.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
      }
    }
    const clubIds = [...new Set(events.flatMap((e) => e.organiser_club_id ? [e.organiser_club_id] : []))];
    const orgIds = [...new Set(links.map((l) => l.organisation_id))];
    if (!clubIds.length || !orgIds.length) return [];
    const mappingMap = new Map<string, ClubMapping>();
    for (const [column, ids] of [["club_id", clubIds], ["organisation_id", orgIds]] as const) {
      for (let offset = 0; offset < ids.length; offset += 100) {
        for (let page = 0; ; page += 1000) {
          const result = await db.from("organisation_club_links")
            .select("id,club_id,organisation_id,review_status,organisations!inner(status)")
            .in(column, ids.slice(offset, offset + 100)).eq("review_status", "accepted")
            .order("id").range(page, page + 999);
          if (result.error) throw result.error;
          for (const row of result.data ?? []) mappingMap.set(row.id, {
            club_id: row.club_id, organisation_id: row.organisation_id,
            review_status: row.review_status, approved: row.organisations.status === "approved",
          });
          if ((result.data?.length ?? 0) < 1000) break;
        }
      }
    }
    const clubs: { id: string; slug: string; name: string; status: string }[] = [];
    for (let offset = 0; offset < clubIds.length; offset += 100) {
      const result = await db.from("clubs").select("id,slug,name,status").in("id", clubIds.slice(offset, offset + 100));
      if (result.error) throw result.error;
      clubs.push(...(result.data ?? []));
    }
    return resolveMonthHostClubs(events, links, [...mappingMap.values()], clubs);
  } catch {
    console.warn("[month-host-clubs] Verified club links unavailable");
    return [];
  }
}