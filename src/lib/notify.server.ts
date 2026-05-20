// Best-effort admin notification email.
// Once Lovable Emails is fully provisioned (DNS verified + email infra set up),
// this will POST to the internal email API. Until then it logs to the server
// and returns silently so submissions never fail because of email problems.

const NOTIFY_TO = "mike@hithe19.com";

export interface NewSubmissionPayload {
  id: string;
  email: string;
  kind: "claim" | "listing";
  claim_slug: string | null;
  submitted_at: string;
}

export async function sendNewSubmissionNotification(
  data: NewSubmissionPayload,
): Promise<void> {
  const subject = `New ${data.kind} — ${data.email}`;
  const body = [
    `Submitter: ${data.email}`,
    `Kind: ${data.kind}`,
    `Claim slug: ${data.claim_slug ?? "—"}`,
    `Submitted: ${data.submitted_at}`,
    "",
    `Review: https://runningeventsnearme.com/admin/claims`,
  ].join("\n");

  try {
    // Attempt to call Lovable's transactional email endpoint if it exists.
    // If the email infra hasn't been scaffolded yet (DNS still pending) this
    // will 404 and we just log — the queue itself still works.
    const res = await fetch(
      "http://localhost/lovable/email/transactional/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: NOTIFY_TO,
          subject,
          text: body,
        }),
      },
    ).catch(() => null);

    if (!res || !res.ok) {
      console.log("[notify] admin email skipped (infra not ready)", {
        to: NOTIFY_TO,
        subject,
        body,
      });
    }
  } catch (err) {
    console.warn("[notify] admin email failed", err);
  }
}
