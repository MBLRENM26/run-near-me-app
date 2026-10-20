import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "race_info", label: "I have information about a race" },
  { value: "correction", label: "Something on a page is wrong" },
  { value: "club", label: "About a running club" },
  { value: "organiser", label: "I organise a race" },
  { value: "other", label: "Something else" },
] as const;

const TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value) as [string, ...string[]];

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().email().max(255),
        topic: z.enum(TOPIC_VALUES),
        race_link: z.string().trim().max(500).optional(),
        message: z.string().trim().min(1).max(3000),
        website: z.string().max(200).optional(), // honeypot
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };
    const { checkSubmissionRateLimit } = await import("@/lib/submission-burst-limit.server");
    if (!(await checkSubmissionRateLimit())) throw new Error("Too many messages. Please try again later.");
    const { consumeDurableSubmissionRate } = await import("@/lib/submission-rate-limit.server");
    const gate = await consumeDurableSubmissionRate();
    if (!gate.ok) throw new Error("Too many messages. Please try again later.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        topic: data.topic,
        race_link: data.race_link || null,
        message: data.message,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Sorry, we couldn't send that. Please try again.");

    import("@/lib/notify.server")
      .then(({ sendNewSubmissionNotification }) =>
        sendNewSubmissionNotification({
          id: row.id,
          email: data.email,
          kind: "contact",
          claim_slug: null,
          submitted_at: new Date().toISOString(),
          name: data.name,
          topic: data.topic,
          race_link: data.race_link || null,
          message: data.message,
        }),
      )
      .catch((err) => console.warn("[contact] notify failed", err));

    return { ok: true as const };
  });
