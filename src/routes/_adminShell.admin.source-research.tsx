import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { canApplyResearch, type ResearchRow } from "@/lib/source-research";
import {
  listSourceResearch,
  importSourceResearch,
  registerResearchSource,
  setResearchSourceEnabled,
  reviewSourceResearch,
  approveResearchClubIdentity,
} from "@/lib/source-research.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_adminShell/admin/source-research")({
  head: () => ({
    meta: [{ title: "Source research — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SourceResearchPage,
});

function SourceResearchPage() {
  const list = useServerFn(listSourceResearch),
    submit = useServerFn(importSourceResearch),
    register = useServerFn(registerResearchSource),
    enable = useServerFn(setResearchSourceEnabled),
    review = useServerFn(reviewSourceResearch);
  const qc = useQueryClient();
  const approveIdentity = useServerFn(approveResearchClubIdentity);
  const [identityInput, setIdentityInput] = useState("");
  const [status, setStatus] = useState<ResearchRow["status"]>("pending"),
    [offset, setOffset] = useState(0);
  const [input, setInput] = useState(""),
    [sourceInput, setSourceInput] = useState(""),
    [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { data, error, isLoading } = useQuery({
    queryKey: ["source-research", status, offset],
    queryFn: () => list({ data: { status, offset } }),
    retry: false,
  });
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage("Saved.");
      await qc.invalidateQueries({ queryKey: ["source-research"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Sources and race research</h1>
      <p>
        Review evidence from club, organiser and entry pages. New race discoveries and conflicting
        information stay here until resolved. Applying a supported correction protects the reviewed
        fields from later imports and records a reversible audit.
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <details className="rounded border p-4">
        <summary>Import research results</summary>
        <p className="my-2 text-sm">
          Paste a version 1 research envelope exported by the worker or prepared from reviewed
          evidence. Its sources must be registered and enabled.
        </p>
        <textarea
          aria-label="Research results JSON"
          className="h-40 w-full rounded border bg-background p-2 font-mono text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          disabled={busy || !input.trim()}
          onClick={() =>
            act(async () => {
              await submit({ data: JSON.parse(input) });
              setInput("");
            })
          }
        >
          Import into review queue
        </Button>
      </details>
      <details className="rounded border p-4">
        <summary>Source catalogue ({data?.sources.length ?? 0}, first 200)</summary>
        <p className="my-2 text-sm">
          Register each listing or race page with its role and access policy. Disabling a source
          refuses further intake; export an updated configuration to stop an offline worker fetching
          it.
        </p>
        <ul>
          {data?.sources.map((s) => (
            <li key={s.id} className="my-3 border-b pb-2">
              <a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline">
                {s.label}
              </a>{" "}
              · {s.role} · every {s.interval_hours}h{" "}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => act(() => enable({ data: { id: s.id, enabled: !s.enabled } }))}
              >
                {s.enabled ? "Pause intake" : "Enable intake"}
              </Button>
              <p className="text-xs">{s.policy_note}</p>
            </li>
          ))}
        </ul>
        <p className="my-2 text-sm">Register source JSON using the documented source contract.</p>
        <textarea
          aria-label="Source registration JSON"
          className="h-28 w-full rounded border bg-background p-2 font-mono text-xs"
          value={sourceInput}
          onChange={(e) => setSourceInput(e.target.value)}
        />
        <Button
          disabled={busy || !sourceInput.trim()}
          onClick={() =>
            act(async () => {
              await register({ data: JSON.parse(sourceInput) });
              setSourceInput("");
            })
          }
        >
          Register source
        </Button>
      </details>
      <details className="rounded border p-4">
        <summary>Review a club identity</summary>
        <p className="my-2 text-sm">
          After checking the evidence, connect an existing organisation to a club. Use a null
          organisation_id to create an organisation under the club's current name. Existing or
          ambiguous mappings require separate review. This action records the identity evidence;
          race relationships are reviewed below.
        </p>
        <textarea
          aria-label="Club identity review JSON"
          className="h-28 w-full rounded border bg-background p-2 font-mono text-xs"
          value={identityInput}
          onChange={(e) => setIdentityInput(e.target.value)}
        />
        <Button
          disabled={busy || !identityInput.trim()}
          onClick={() =>
            act(async () => {
              const result = await approveIdentity({ data: JSON.parse(identityInput) });
              setIdentityInput(JSON.stringify(result, null, 2));
            })
          }
        >
          Approve evidenced club identity
        </Button>
      </details>
      <nav className="flex flex-wrap gap-2" aria-label="Research status">
        {(["pending", "held", "applied", "rejected", "reverted"] as const).map((s) => (
          <Button
            key={s}
            variant={s === status ? "default" : "outline"}
            onClick={() => {
              setStatus(s);
              setOffset(0);
            }}
          >
            {s}
          </Button>
        ))}
      </nav>
      {isLoading && <p>Loading…</p>}
      {data?.rows.length === 0 && <p>No {status} observations.</p>}
      {data?.rows.map((r) => (
        <article key={r.id} className="space-y-3 rounded border p-4">
          <h2 className="font-semibold">
            {(r.current_event?.name as string) ??
              ("name" in r.proposal ? r.proposal.name : "Page evidence")}{" "}
            · {r.proposal.kind.replaceAll("_", " ")}
          </h2>
          <p className="whitespace-pre-wrap">{r.evidence.summary}</p>
          <a
            href={r.evidence.final_url}
            className="break-all text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Read source
          </a>
          <p className="text-xs">
            Captured {r.evidence.captured_at} · {r.evidence.extractor}
          </p>
          {r.conflicts.length > 0 && (
            <ul className="list-disc pl-5">
              {r.conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="font-medium">Current record</h3>
              <pre className="overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(r.current_event, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium">Proposed finding</h3>
              <pre className="overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(r.proposal, null, 2)}
              </pre>
            </div>
          </div>
          {r.review_note && <p>Review: {r.review_note}</p>}
          {(["pending", "held", "applied"] as string[]).includes(r.status) && (
            <>
              <label className="block">
                Review note
                <input
                  className="mt-1 w-full rounded border bg-background p-2"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {(r.status === "applied"
                  ? (["revert"] as const)
                  : ["hold", "reject", ...(canApplyResearch(r) ? ["apply" as const] : [])]
                ).map((action) => (
                  <Button
                    key={action}
                    disabled={busy || !notes[r.id]?.trim()}
                    variant={action === "apply" ? "default" : "outline"}
                    onClick={() =>
                      act(() => review({ data: { id: r.id, action, note: notes[r.id] } }))
                    }
                  >
                    {action === "apply"
                      ? "Apply reviewed correction"
                      : action === "revert"
                        ? "Reverse this correction"
                        : action === "hold"
                          ? "Hold for research"
                          : "Reject"}
                  </Button>
                ))}
              </div>
            </>
          )}
        </article>
      ))}
      <div className="flex items-center gap-3">
        <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
          Previous
        </Button>
        <span>{data?.total ?? 0} observations</span>
        <Button disabled={offset + 50 >= (data?.total ?? 0)} onClick={() => setOffset(offset + 50)}>
          Next
        </Button>
      </div>
      <details className="rounded border p-4">
        <summary>Recent import conflicts</summary>
        <p>
          Reviewed values were preserved. Investigate the incoming source before changing or
          reversing the review.
        </p>
        <pre className="overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(data?.conflicts ?? [], null, 2)}
        </pre>
      </details>
      <details className="rounded border p-4">
        <summary>Recent review history</summary>
        <pre className="overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(data?.reviews ?? [], null, 2)}
        </pre>
      </details>
    </main>
  );
}
