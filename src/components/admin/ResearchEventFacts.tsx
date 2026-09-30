import { useState } from "react";
import type { EventExtraction } from "@/lib/research-event-facts";

export function ResearchEventFacts({
  extraction,
  candidates = [],
  limited = false,
}: {
  extraction: EventExtraction;
  candidates?: Record<string, unknown>[];
  limited?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const current = candidates.find((e) => e.id === selected);
  return (
    <section className="space-y-3" aria-label="Database mapped race facts">
      <h3 className="font-medium">Race facts for review</h3>
      <p className="text-sm">
        These are source candidates. Confirm the race and edition before using the existing event
        editor or preparing a reviewed correction.
      </p>
      {candidates.length > 0 ? (
        <label className="block text-sm">
          Compare with an existing record sharing this source URL
          <select
            className="mt-1 block w-full rounded border bg-background p-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose a record after checking its identity</option>
            {candidates.map((event) => (
              <option key={String(event.id)} value={String(event.id)}>
                {String(event.name)} · {String(event.date_from ?? "Undated")} ·{" "}
                {String(event.status)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm">
          No exact source URL match found. Locate the race in the event editor before linking or
          creating an occurrence.
        </p>
      )}
      {limited && (
        <p className="text-sm">
          Candidate lookup reached its limit; search the event editor for other matches.
        </p>
      )}
      {current && (
        <p className="break-all text-xs">
          Comparing record {String(current.id)}. A shared URL does not confirm the edition.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Database field</th>
              <th className="p-2">Current value</th>
              <th className="p-2">Source candidate</th>
              <th className="p-2">Supporting evidence</th>
            </tr>
          </thead>
          <tbody>
            {extraction.facts.map((fact, i) => (
              <tr className="border-t align-top" key={i}>
                <td className="p-2 font-mono">{fact.field}</td>
                <td className="max-w-60 break-words p-2">
                  {current ? String(current[fact.field] ?? "Not set") : "Select a record"}
                </td>
                <td className="max-w-72 break-words p-2">{String(fact.value)}</td>
                <td className="max-w-80 p-2">
                  <q>{fact.quote}</q>
                  <p className="break-all text-xs text-muted-foreground">{fact.locator}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extraction.facts.length === 0 && (
        <p>No supported race facts were extracted. Inspect the source or its rendered page.</p>
      )}
      <p className="text-sm">
        No evidence extracted for: {extraction.missing_fields.join(", ") || "none"}. Existing values
        are preserved.
      </p>
      <p className="text-sm">
        Tags, region, identity links and publication controls continue through the existing
        enrichment, ORL and review workflows.
      </p>
    </section>
  );
}
