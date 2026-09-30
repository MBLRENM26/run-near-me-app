import { z } from "zod";
import fields from "../../services/race-monitor/event-fields.json";

// Shared with the Python extractor. Only direct source facts belong here;
// IDs, ORL, derived tags, publication and editorial controls retain their owners.
export const researchEventFields = Object.keys(fields);
type Rule = { type: string; min?: number; max?: number };
export const eventFactSchema = z
  .object({
    field: z.string().refine((field) => Object.hasOwn(fields, field), "Unknown source field"),
    value: z.union([z.string().min(1).max(1000), z.number().finite(), z.boolean()]),
    quote: z.string().trim().min(1).max(240),
    locator: z.string().min(1).max(160),
  })
  .strict()
  .superRefine((fact, ctx) => {
    const rule = (fields as Record<string, Rule>)[fact.field];
    if (!rule) return;
    let valid = false;
    if (["string", "date", "url"].includes(rule.type) && typeof fact.value === "string") {
      valid = fact.value.trim().length > 0 && fact.value.length <= (rule.max ?? 1000);
      if (rule.type === "date") valid &&= z.iso.date().safeParse(fact.value).success;
      if (rule.type === "url") {
        try {
          const u = new URL(fact.value);
          valid &&= ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
        } catch {
          valid = false;
        }
      }
    } else if (rule.type === "number" && typeof fact.value === "number") {
      valid = fact.value >= rule.min! && fact.value <= rule.max!;
    } else if (rule.type === "boolean") valid = typeof fact.value === "boolean";
    if (!valid)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Value does not match events column contract",
      });
  });

export const eventExtractionSchema = z
  .object({
    version: z.literal(1),
    facts: z.array(eventFactSchema).max(32),
    missing_fields: z.array(z.string()).max(researchEventFields.length),
    issues: z.array(z.string().min(1).max(240)).max(10),
  })
  .strict()
  .superRefine((data, ctx) => {
    const present = new Set(data.facts.map((f) => f.field));
    const missing = researchEventFields.filter((f) => !present.has(f)).sort();
    if (JSON.stringify([...data.missing_fields].sort()) !== JSON.stringify(missing))
      ctx.addIssue({
        code: "custom",
        path: ["missing_fields"],
        message: "Missing fields must match absent source facts",
      });
    if (present.has("lat") !== present.has("lng"))
      ctx.addIssue({ code: "custom", message: "Coordinates require an evidenced pair" });
    if (data.facts.reduce((sum, f) => sum + f.quote.length, 0) > 4000)
      ctx.addIssue({ code: "custom", message: "Supporting excerpts exceed retention limit" });
    if (
      new Set(data.facts.map((f) => JSON.stringify([f.field, f.value]))).size !== data.facts.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate fact" });
    if (
      data.facts.some((f) => f.field === "is_recurring" && f.value === true) &&
      (present.has("date_from") || present.has("date_to"))
    )
      ctx.addIssue({ code: "custom", message: "Weekly recurring run must remain undated" });
  });
export type EventExtraction = z.infer<typeof eventExtractionSchema>;
