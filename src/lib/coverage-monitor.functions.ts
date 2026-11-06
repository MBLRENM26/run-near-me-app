import { createServerFn } from "@tanstack/react-start";

export const getCoverageReports = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdminAuthenticated } = await import("./admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("coverage_reports").select("id, audit_day, created_at, snapshot, calendars").order("audit_day", { ascending: false }).limit(28);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const checkCoverageNow = createServerFn({ method: "POST" }).handler(async () => {
  const { isAdminAuthenticated } = await import("./admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const { runCoverageCheck } = await import("./coverage-monitor.server");
  return runCoverageCheck();
});