import { useState } from "react";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubmissionRow as Row } from "@/lib/admin.functions";

const STATUS_LABELS: Record<Row["status"], string> = {
  new: "New",
  in_review: "In review",
  actioned: "Actioned",
  rejected: "Rejected",
  spam: "Spam",
};

interface Props {
  row: Row;
  selected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  onSave: (id: string, patch: { status?: Row["status"]; admin_note?: string | null }) => Promise<void>;
  onCreateEvent?: (id: string) => Promise<void>;
}

export function SubmissionRowCard({
  row,
  selected,
  onSelectChange,
  onSave,
  onCreateEvent,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Row["status"]>(row.status);
  const [note, setNote] = useState(row.admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const dirty = status !== row.status || (note || "") !== (row.admin_note ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(row.id, {
        status: status !== row.status ? status : undefined,
        admin_note: (note || "") !== (row.admin_note ?? "") ? note || null : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!onCreateEvent) return;
    setCreating(true);
    try {
      await onCreateEvent(row.id);
    } finally {
      setCreating(false);
    }
  };

  const submittedDate = new Date(row.submitted_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const kindClass =
    row.kind === "claim"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  const hasStructured = Boolean(row.race_name);
  const canCreateEvent =
    hasStructured && !row.created_event_id && row.kind === "listing";

  const raceDate = row.race_date
    ? new Date(row.race_date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const locationLine = [row.town, row.county, row.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectChange(row.id, Boolean(v))}
            aria-label="Select submission"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase ${kindClass}`}>
              {row.kind}
            </span>
            <span className="font-medium text-foreground truncate">{row.email}</span>
            {row.claim_slug && (
              <a
                href={`/events/${row.claim_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {row.claim_slug}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{submittedDate}</span>
          </div>

          {hasStructured ? (
            <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-semibold text-foreground">
                {row.race_name}
                {raceDate && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    · {raceDate}
                  </span>
                )}
              </div>
              <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2 text-xs">
                {row.website_url && (
                  <div className="sm:col-span-2 flex gap-2">
                    <dt className="text-muted-foreground shrink-0">Website</dt>
                    <dd className="min-w-0 truncate">
                      <a
                        href={row.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.website_url}
                      </a>
                    </dd>
                  </div>
                )}
                {row.distances && row.distances.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground inline">Distances: </dt>
                    <dd className="inline text-foreground">
                      {row.distances.join(", ")}
                    </dd>
                  </div>
                )}
                {row.terrain && (
                  <div>
                    <dt className="text-muted-foreground inline">Terrain: </dt>
                    <dd className="inline text-foreground">{row.terrain}</dd>
                  </div>
                )}
                {locationLine && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground inline">Location: </dt>
                    <dd className="inline text-foreground">{locationLine}</dd>
                  </div>
                )}
                {row.organiser && (
                  <div>
                    <dt className="text-muted-foreground inline">Organiser: </dt>
                    <dd className="inline text-foreground">{row.organiser}</dd>
                  </div>
                )}
                {row.submitted_entry_fee && (
                  <div>
                    <dt className="text-muted-foreground inline">Entry fee: </dt>
                    <dd className="inline text-foreground">
                      {row.submitted_entry_fee}
                    </dd>
                  </div>
                )}
              </dl>
              {row.event_details && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? "Hide raw submission" : "Show raw submission"}
                </button>
              )}
              {expanded && row.event_details && (
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-background rounded p-2 border border-border">
                  {row.event_details}
                </pre>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <p
                className={`text-sm text-foreground whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}
              >
                {row.event_details}
              </p>
              {row.event_details.length > 200 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
              <p className="mt-2 text-xs italic text-muted-foreground">
                Legacy free-text submission — no structured fields.
              </p>
            </div>
          )}

          {/* Publish action */}
          {row.created_event_id ? (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
              <span className="text-foreground">Draft event created.</span>
              <a
                href={`/admin/events/${row.created_event_id}`}
                className="ml-auto inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Open event editor
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : canCreateEvent ? (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Creating…" : "Create event from submission"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Inserts a draft event (hidden from the public site) and marks
                this submission as actioned. Review + set to ACTIVE to publish.
              </p>
            </div>
          ) : !hasStructured && row.kind === "listing" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Create this event manually via{" "}
              <a href="/admin/events/new" className="text-primary hover:underline">
                New event
              </a>
              .
            </p>
          ) : null}

          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <Select value={status} onValueChange={(v) => setStatus(v as Row["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as Row["status"][]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Internal note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
            />
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
