import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Loaded lazily so the server-only session module never enters the client
// import graph (route components statically import this module).
const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import(
    "@/lib/admin-session.server"
  );
  return impl();
});


async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

async function requireAdminMutation() {
  await requireAdmin();
}


export interface UnseenCounts {
  submissions: number;
  clubClaims: number;
  emailSubscriptions: number;
  total: number;
}

// Cheap poll used by the admin shell to show a badge / banner.
export const getUnseenCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnseenCounts> => {
    // Called from the admin shell on every page — return zeros instead of
    // throwing when the session is missing/expired so the shell doesn't
    // blank-screen before the child route redirects to /admin/login.
    if (!(await isAdminAuthenticated())) {
      return { submissions: 0, clubClaims: 0, emailSubscriptions: 0, total: 0 };
    }
    const [{ count: subs }, { count: claims }, { count: emailSubs }] =
      await Promise.all([
        supabaseAdmin
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .is("seen_at", null),
        supabaseAdmin
          .from("club_claims")
          .select("id", { count: "exact", head: true })
          .is("seen_at", null),
        supabaseAdmin
          .from("email_subscriptions")
          .select("id", { count: "exact", head: true })
          .is("seen_at", null),
      ]);
    const s = subs ?? 0;
    const c = claims ?? 0;
    const e = emailSubs ?? 0;
    return {
      submissions: s,
      clubClaims: c,
      emailSubscriptions: e,
      total: s + c + e,
    };
  },
);



// Called by the /admin/claims page when the admin lands on it.
export const markSubmissionsSeen = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; marked: number }> => {
    await requireAdminMutation();
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .update({ seen_at: new Date().toISOString() })
      .is("seen_at", null)
      .select("id");
    if (error) throw new Error(error.message);
    return { ok: true, marked: data?.length ?? 0 };
  },
);

export const markClubClaimsSeen = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; marked: number }> => {
    await requireAdminMutation();
    const { data, error } = await supabaseAdmin
      .from("club_claims")
      .update({ seen_at: new Date().toISOString() })
      .is("seen_at", null)
      .select("id");
    if (error) throw new Error(error.message);
    return { ok: true, marked: data?.length ?? 0 };
  },
);

// Manual "Resend admin email" for a single submission — used to recover
// from any historical miss.
export const resendAdminNotification = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ submissionId: z.string().uuid() }).parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      ok: boolean;
      status: "sent" | "suppressed" | "failed" | "skipped" | "not-found";
      reason?: string;
    }> => {
      await requireAdminMutation();
      const { data: row, error } = await supabaseAdmin
        .from("submissions")
        .select("id, email, kind, claim_slug, submitted_at")
        .eq("id", data.submissionId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return { ok: false, status: "not-found" };

      const { sendNewSubmissionNotification } = await import(
        "@/lib/notify.server"
      );
      const res = await sendNewSubmissionNotification({
        id: row.id,
        email: row.email,
        kind: row.kind as "listing" | "claim",
        claim_slug: row.claim_slug,
        submitted_at: row.submitted_at,
      });
      return res;
    },
  );
